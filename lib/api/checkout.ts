import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/** Live `company_payment_account` predates the generated snapshot in this repo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const live = supabase as any;

export type CheckoutAppointment = {
  id: string;
  client_id: string | null;
  client: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
  appointment_segment: Array<{
    id: string;
    sequence: number;
    price: number | null;
    service_id: string;
    service_variant_id: string;
    service: { id: string; name: string } | null;
    service_variant: { id: string; name: string; price: number; vat_rate: number | null } | null;
  }>;
};

export type CheckoutLineItem = {
  appointmentSegmentId: string;
  serviceId: string;
  serviceVariantId: string;
  name: string;
  price: number;
  vatRate: number;
};

const CHECKOUT_APPOINTMENT_SELECT = `
  id,
  client_id,
  client:client_id ( id, first_name, last_name, email ),
  appointment_segment (
    id, sequence, price, service_id, service_variant_id,
    service:service_id ( id, name ),
    service_variant:service_variant_id ( id, name, price, vat_rate )
  )
`;

export async function fetchAppointmentForCheckout(appointmentId: string): Promise<CheckoutAppointment | null> {
  const { data, error } = await supabase
    .from('appointment')
    .select(CHECKOUT_APPOINTMENT_SELECT)
    .eq('id', appointmentId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as CheckoutAppointment | null;
}

export function checkoutLineItems(appointment: CheckoutAppointment): CheckoutLineItem[] {
  return [...(appointment.appointment_segment ?? [])]
    .sort((a, b) => a.sequence - b.sequence)
    .filter((segment) => segment.service && segment.service_variant)
    .map((segment) => ({
      appointmentSegmentId: segment.id,
      serviceId: segment.service_id,
      serviceVariantId: segment.service_variant_id,
      name: `${segment.service!.name} - ${segment.service_variant!.name}`,
      price: Math.round(Number(segment.price ?? segment.service_variant!.price ?? 0) * 100) / 100,
      vatRate: segment.service_variant!.vat_rate ?? 0,
    }));
}

export function clientCheckoutEmail(
  client: { email?: string | null } | null | undefined
): string | null {
  const email = client?.email?.trim();
  return email ? email : null;
}

export type CheckoutPaymentType = 'cash' | 'card' | 'invoice' | 'bank_transfer' | 'pay_link';

export const CHECKOUT_PAYMENT_TYPES: CheckoutPaymentType[] = [
  'cash',
  'card',
  'pay_link',
  'invoice',
  'bank_transfer',
];

export function isConnectPaymentType(type: CheckoutPaymentType): boolean {
  return type === 'card' || type === 'pay_link';
}

function isImmediatePaid(type: CheckoutPaymentType): boolean {
  return type === 'cash' || type === 'invoice' || type === 'bank_transfer';
}

export type PaymentReadiness = {
  chargesEnabled: boolean;
  readerId: string | null;
};

export async function fetchPaymentReadiness(companyId: string): Promise<PaymentReadiness> {
  const [accountResult, companyResult] = await Promise.all([
    live
      .from('company_payment_account')
      .select('charges_enabled')
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase.from('company').select('reader_id').eq('id', companyId).maybeSingle(),
  ]);

  if (accountResult.error) throw accountResult.error;
  if (companyResult.error) throw companyResult.error;

  const readerId = companyResult.data?.reader_id;
  return {
    chargesEnabled: accountResult.data?.charges_enabled === true,
    readerId: typeof readerId === 'string' && readerId.length > 0 ? readerId : null,
  };
}

export type CreateOrderPayload = {
  companyId: string;
  locationId?: string;
  appointmentId: string;
  clientId?: string;
  lineItems: CheckoutLineItem[];
  paymentType: CheckoutPaymentType;
  amount: number;
};

export type CreatedOrder = {
  orderId: string;
  orderNumber?: string;
  paymentIntentId?: string | null;
};

export class CheckoutApiError extends Error {
  readonly code: string | null;

  constructor(message: string, code?: string | null) {
    super(message);
    this.name = 'CheckoutApiError';
    this.code = code ?? null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(record: Record<string, unknown> | null, ...keys: string[]): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

/** supabase-js / OkResponse may nest the payload as `data` or `data.data`. */
function unwrapEnvelope(raw: unknown): Record<string, unknown> | null {
  const root = asRecord(raw);
  if (!root) return null;
  const nested = asRecord(root.data);
  if (!nested) return root;
  const deeper = asRecord(nested.data);
  if (deeper && (deeper.url || deeper.order_id || deeper.orderId || deeper.session_id)) {
    return deeper;
  }
  if (nested.url || nested.order_id || nested.orderId || nested.session_id || nested.payments) {
    return nested;
  }
  return root;
}

function firstPayment(record: Record<string, unknown> | null): Record<string, unknown> | null {
  const payments = record?.payments;
  if (!Array.isArray(payments) || payments.length === 0) return null;
  return asRecord(payments[0]);
}

function locationHeaders(locationId?: string): Record<string, string> | undefined {
  return locationId ? { 'x-location-id': locationId } : undefined;
}

function locationBody(locationId?: string): Record<string, string> {
  return locationId ? { location_id: locationId, locationId } : {};
}

async function throwFunctionError(error: unknown): Promise<never> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      const record = asRecord(body);
      const code = stringField(record, 'error', 'code') ?? null;
      const message = stringField(record, 'message') ?? code ?? error.message;
      throw new CheckoutApiError(message, code);
    } catch (parsed) {
      if (parsed instanceof CheckoutApiError) throw parsed;
    }
    throw new CheckoutApiError(error.message);
  }
  if (error instanceof CheckoutApiError) throw error;
  if (error instanceof Error) throw error;
  throw new CheckoutApiError('Request failed');
}

function throwIfFailedEnvelope(raw: unknown): void {
  const record = asRecord(raw);
  if (!record) return;
  if (record.success === false) {
    const code = stringField(record, 'error', 'code') ?? null;
    const message = stringField(record, 'message') ?? code ?? 'Request failed';
    throw new CheckoutApiError(message, code);
  }
}

export async function createOrderWithPayment(payload: CreateOrderPayload): Promise<CreatedOrder> {
  const paid = isImmediatePaid(payload.paymentType);
  const { data, error } = await supabase.functions.invoke('order-create', {
    headers: locationHeaders(payload.locationId),
    body: {
      company_id: payload.companyId,
      ...locationBody(payload.locationId),
      appointment_id: payload.appointmentId,
      client_id: payload.clientId,
      treatments: payload.lineItems.map((item) => ({
        appointment_segment_id: item.appointmentSegmentId,
        service_id: item.serviceId,
        service_variant_id: item.serviceVariantId,
        quantity: 1,
        unit_price: item.price,
        vat_rate: item.vatRate,
        discount_amount: 0,
      })),
      payments: [{ payment_type: payload.paymentType, amount: payload.amount, paid }],
      date: new Date().toISOString(),
      currency: 'eur',
    },
  });

  if (error) await throwFunctionError(error);
  throwIfFailedEnvelope(data);

  const envelope = unwrapEnvelope(data);
  const payment = firstPayment(envelope) ?? firstPayment(asRecord(data));
  const orderId =
    stringField(envelope, 'order_id', 'orderId') ??
    stringField(asRecord(data), 'order_id', 'orderId') ??
    stringField(asRecord(asRecord(data)?.data), 'order_id', 'orderId');

  if (!orderId) {
    throw new CheckoutApiError('Order create did not return an order id');
  }

  return {
    orderId,
    orderNumber:
      stringField(envelope, 'order_number', 'orderNumber') ??
      stringField(asRecord(data), 'order_number', 'orderNumber') ??
      orderId,
    paymentIntentId:
      stringField(payment, 'payment_intent_id', 'paymentIntentId') ??
      stringField(asRecord(payment?.payment_intent), 'id') ??
      null,
  };
}

const PAY_LINK_RETURN_ORIGIN = 'https://booking.salonify.co';

export type PayLinkCheckoutResult = {
  url?: string;
  sessionId?: string;
  orderId?: string;
  paymentId?: string;
  email?: string;
};

export async function createPayLinkCheckout(payload: {
  companyId: string;
  orderId: string;
  locationId?: string;
  amount?: number;
  clientEmail?: string;
}): Promise<PayLinkCheckoutResult> {
  const successUrl = `${PAY_LINK_RETURN_ORIGIN}/pay/success?order_id=${encodeURIComponent(payload.orderId)}`;
  const cancelUrl = `${PAY_LINK_RETURN_ORIGIN}/pay/cancel?order_id=${encodeURIComponent(payload.orderId)}`;

  const { data, error } = await supabase.functions.invoke('payment-create-checkout', {
    headers: locationHeaders(payload.locationId),
    body: {
      company_id: payload.companyId,
      order_id: payload.orderId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(payload.amount != null ? { amount: payload.amount } : {}),
      ...(payload.clientEmail ? { client_email: payload.clientEmail } : {}),
      ...locationBody(payload.locationId),
    },
  });

  if (error) await throwFunctionError(error);
  throwIfFailedEnvelope(data);

  const envelope = unwrapEnvelope(data);
  return {
    url: stringField(envelope, 'url'),
    sessionId: stringField(envelope, 'session_id', 'sessionId'),
    orderId: stringField(envelope, 'order_id', 'orderId') ?? payload.orderId,
    paymentId: stringField(envelope, 'payment_id', 'paymentId'),
    email: stringField(envelope, 'email') ?? payload.clientEmail,
  };
}

export async function processTerminalPayment(payload: {
  companyId: string;
  readerId: string;
  paymentIntentId: string;
  locationId?: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke('payment-process-terminal', {
    headers: locationHeaders(payload.locationId),
    body: {
      company_id: payload.companyId,
      reader_id: payload.readerId,
      payment_intent_id: payload.paymentIntentId,
      ...locationBody(payload.locationId),
    },
  });

  if (error) await throwFunctionError(error);
  throwIfFailedEnvelope(data);
}

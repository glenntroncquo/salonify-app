import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type CheckoutPriceOption = {
  id: string;
  name: string;
  price: number;
  vat_rate: number | null;
};

export type CheckoutAppointment = {
  id: string;
  client_id: string | null;
  client: { id: string; first_name: string | null; last_name: string | null } | null;
  appointment_treatment: Array<{
    id: string;
    treatment_id: string;
    treatment: { id: string; name: string } | null;
    price_option: CheckoutPriceOption | null;
  }>;
  treatment_id: string | null;
  price_option: CheckoutPriceOption | null;
};

export type CheckoutLineItem = {
  appointmentTreatmentId?: string;
  treatmentId: string;
  priceOptionId: string;
  name: string;
  price: number;
  vatRate: number;
};

const CHECKOUT_APPOINTMENT_SELECT = `
  id,
  client_id,
  client:client_id ( id, first_name, last_name ),
  appointment_treatment ( id, treatment_id, treatment:treatment_id ( id, name ), price_option:price_option_id ( id, name, price, vat_rate ) ),
  treatment_id,
  price_option:price_option_id ( id, name, price, vat_rate )
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

/** Flattens the appointment_treatment array, falling back to the legacy single treatment_id/price_option columns. */
export function checkoutLineItems(appointment: CheckoutAppointment): CheckoutLineItem[] {
  if (appointment.appointment_treatment?.length > 0) {
    return appointment.appointment_treatment
      .filter((at) => at.treatment && at.price_option)
      .map((at) => ({
        appointmentTreatmentId: at.id,
        treatmentId: at.treatment_id,
        priceOptionId: at.price_option!.id,
        name: at.treatment!.name,
        price: at.price_option!.price,
        vatRate: at.price_option!.vat_rate ?? 0,
      }));
  }
  if (appointment.treatment_id && appointment.price_option) {
    return [
      {
        treatmentId: appointment.treatment_id,
        priceOptionId: appointment.price_option.id,
        name: appointment.price_option.name,
        price: appointment.price_option.price,
        vatRate: appointment.price_option.vat_rate ?? 0,
      },
    ];
  }
  return [];
}

export type CheckoutPaymentType = 'cash' | 'card' | 'invoice' | 'bank_transfer';

export type CreateOrderPayload = {
  companyId: string;
  appointmentId: string;
  clientId?: string;
  lineItems: CheckoutLineItem[];
  paymentType: CheckoutPaymentType;
  amount: number;
};

export async function createOrderWithPayment(payload: CreateOrderPayload): Promise<{ order_number?: string }> {
  const { data, error } = await supabase.functions.invoke('create-order-with-payment-v3', {
    body: {
      company_id: payload.companyId,
      appointment_id: payload.appointmentId,
      client_id: payload.clientId,
      treatments: payload.lineItems.map((item) => ({
        appointment_treatment_id: item.appointmentTreatmentId,
        treatment_id: item.treatmentId,
        price_option_id: item.priceOptionId,
        quantity: 1,
        unit_price: item.price,
        vat_rate: item.vatRate,
        discount_amount: 0,
      })),
      payments: [{ payment_type: payload.paymentType, amount: payload.amount, paid: true }],
      date: new Date().toISOString(),
      currency: 'eur',
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      let detail = error.message;
      try {
        const body = await error.context.json();
        if (typeof body?.error === 'string') detail = body.error;
      } catch {
        // Body wasn't JSON — fall back to the generic message.
      }
      throw new Error(detail);
    }
    throw error;
  }

  return data ?? {};
}

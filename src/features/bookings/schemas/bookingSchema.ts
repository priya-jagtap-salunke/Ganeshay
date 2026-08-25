import { z } from 'zod';

export const bookingSchema = z
  .object({
    customer_name: z.string().min(2, 'Customer name is required'),
    mobile: z
      .string()
      .min(10, 'Valid mobile number required')
      .regex(/^[0-9+\-\s]{10,15}$/, 'Invalid mobile number'),
    booking_date: z.string().min(1, 'Booking date required'),
    price: z.coerce.number().min(1, 'Total price is required'),
    advance: z.coerce.number().min(0, 'Advance cannot be negative'),
    payment_mode: z.enum(['Cash', 'UPI', 'Card']).optional(),
    notes: z.string().optional(),
    murti_photo_uri: z.string().nullable().optional(),
  })
  .refine((data) => data.advance <= data.price, {
    message: 'Advance cannot exceed total price',
    path: ['advance'],
  });

export type BookingSchemaType = z.infer<typeof bookingSchema>;

import { useCallback } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingSchema, BookingSchemaType } from '../schemas/bookingSchema';
import { AppInput } from '@/components/ui/AppInput';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppButton } from '@/components/ui/AppButton';
import { formatCurrency } from '@/utils/currency';
import { getTodayString } from '@/utils/dates';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

const PAYMENT_MODES = [
  { label: 'Cash', value: 'Cash' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Card', value: 'Card' },
];

interface BookingFormProps {
  defaultValues?: Partial<BookingSchemaType>;
  onSubmit: (data: BookingSchemaType) => void;
  isLoading?: boolean;
  submitLabel?: string;
  /** Clear all fields each time this screen is opened (new booking only). */
  resetOnFocus?: boolean;
}

export function getEmptyBookingDefaults(): Partial<BookingSchemaType> {
  return {
    customer_name: '',
    mobile: '',
    booking_date: getTodayString(),
    price: undefined,
    advance: 0,
    payment_mode: undefined,
    notes: '',
  };
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function BookingForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Save Booking',
  resetOnFocus = false,
}: BookingFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<BookingSchemaType>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      ...getEmptyBookingDefaults(),
      ...defaultValues,
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (!resetOnFocus) return;
      reset(getEmptyBookingDefaults());
    }, [reset, resetOnFocus])
  );

  const price = watch('price') || 0;
  const advance = watch('advance') || 0;
  const pending = Math.max(0, Number(price) - Number(advance));

  return (
    <View style={styles.form}>
      <View style={[styles.formCard, shadows.sm as ViewStyle]}>
        <SectionTitle title="Customer Details" />
        <Controller
          control={control}
          name="customer_name"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Customer Name *"
              value={value}
              onChangeText={onChange}
              error={errors.customer_name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="mobile"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Mobile Number *"
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
              error={errors.mobile?.message}
            />
          )}
        />
      </View>

      <View style={[styles.formCard, shadows.sm as ViewStyle]}>
        <SectionTitle title="Booking Details" />
        <Controller
          control={control}
          name="booking_date"
          render={({ field: { onChange, value } }) => (
            <AppDatePicker
              label="Booking Date"
              value={value}
              onChange={onChange}
              error={errors.booking_date?.message}
            />
          )}
        />
      </View>

      <View style={[styles.formCard, shadows.sm as ViewStyle]}>
        <SectionTitle title="Payment Details" />
        <Controller
          control={control}
          name="price"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Total Price *"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="numeric"
              error={errors.price?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="advance"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Advance Amount *"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="numeric"
              error={errors.advance?.message}
            />
          )}
        />
        <View style={styles.pendingBox}>
          <Text style={styles.pendingLabel}>Pending Amount</Text>
          <Text style={styles.pendingValue}>{formatCurrency(pending)}</Text>
        </View>
        <Controller
          control={control}
          name="payment_mode"
          render={({ field: { onChange, value } }) => (
            <AppSelect
              label="Payment Mode"
              value={value}
              options={PAYMENT_MODES}
              onChange={onChange}
            />
          )}
        />
      </View>

      <View style={[styles.formCard, shadows.sm as ViewStyle]}>
        <SectionTitle title="Notes" />
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Notes (Optional)"
              value={value ?? ''}
              onChangeText={onChange}
              multiline
            />
          )}
        />
      </View>

      <AppButton onPress={handleSubmit(onSubmit)} loading={isLoading} icon="content-save">
        {submitLabel}
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: spacing.md,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionAccent: {
    width: 4,
    height: 22,
    backgroundColor: colors.deepSaffron,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.royalRed,
    letterSpacing: 0.3,
  },
  pendingBox: {
    backgroundColor: colors.warmIvory,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  pendingLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pendingValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.deepSaffron,
  },
});

import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppButton } from '@/components/ui/AppButton';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { AppInput } from '@/components/ui/AppInput';
import {
  filterExpensesByYear,
  sumExpenses,
} from '../api/expensesApi';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
} from '../hooks/useReports';
import { Expense } from '@/types/expense';
import { formatCurrency } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

interface ManageExpensesCardProps {
  year: number;
}

function ExpenseRow({
  expense,
  onDelete,
  deleting,
}: {
  expense: Expense;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <View style={styles.expenseRow}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseTitle}>{expense.title}</Text>
        <Text style={styles.expenseMeta}>
          {formatDisplayDate(expense.expense_date)}
        </Text>
      </View>
      <View style={styles.expenseActions}>
        <Text style={styles.expenseAmount}>
          {formatCurrency(Number(expense.amount))}
        </Text>
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${expense.title}`}
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && styles.pressed,
            deleting && styles.deleteDisabled,
          ]}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ManageExpensesCard({ year }: ManageExpensesCardProps) {
  const currentYear = new Date().getFullYear();
  const { data: allExpenses, isLoading, refetch } = useExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState<string | undefined>();
  const [titleError, setTitleError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();

  useEffect(() => {
    // When browsing a prior year, prefill a date in that year so adds land there.
    setExpenseDate(year === currentYear ? undefined : `${year}-01-01`);
  }, [year, currentYear]);

  const yearExpenses = useMemo(
    () => filterExpensesByYear(allExpenses ?? [], year),
    [allExpenses, year]
  );

  const ytdTotal = useMemo(
    () => sumExpenses(filterExpensesByYear(allExpenses ?? [], currentYear)),
    [allExpenses, currentYear]
  );

  const yearTotal = useMemo(() => sumExpenses(yearExpenses), [yearExpenses]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setExpenseDate(year === currentYear ? undefined : `${year}-01-01`);
    setTitleError(undefined);
    setAmountError(undefined);
  };

  const handleAdd = async () => {
    let valid = true;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError('Title is required');
      valid = false;
    } else {
      setTitleError(undefined);
    }

    const parsedAmount = Number(amount);
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setAmountError('Enter a valid amount');
      valid = false;
    } else {
      setAmountError(undefined);
    }

    if (!valid) return;

    try {
      await createExpense.mutateAsync({
        title: trimmedTitle,
        amount: parsedAmount,
        expense_date: expenseDate || null,
      });
      resetForm();
    } catch (err) {
      Alert.alert('Could not add expense', getErrorMessage(err));
    }
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      `Remove "${expense.title}" (${formatCurrency(Number(expense.amount))})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense.mutateAsync(expense.id);
            } catch (err) {
              Alert.alert('Delete Failed', getErrorMessage(err));
            }
          },
        },
      ]
    );
  };

  return (
    <View>
      <View style={styles.ytdBox}>
        <Text style={styles.ytdLabel}>{currentYear} expenses (YTD)</Text>
        <Text style={styles.ytdValue}>
          {isLoading ? '…' : formatCurrency(ytdTotal)}
        </Text>
      </View>

      {year !== currentYear ? (
        <View style={styles.yearTotalRow}>
          <Text style={styles.summaryLabel}>{year} total</Text>
          <Text style={styles.summaryValue}>
            {isLoading ? '…' : formatCurrency(yearTotal)}
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Add expense</Text>
      <AppInput
        label="Title *"
        value={title}
        onChangeText={setTitle}
        error={titleError}
        placeholder="e.g. Shop rent, Murti purchase"
      />
      <AppInput
        label="Expense amount *"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        error={amountError}
      />
      <AppDatePicker
        label="Date of expense"
        value={expenseDate}
        onChange={setExpenseDate}
        optional
      />
      <AppButton
        icon="plus"
        onPress={handleAdd}
        loading={createExpense.isPending}
        disabled={createExpense.isPending}
      >
        Add Expense
      </AppButton>

      <Text style={[styles.sectionLabel, styles.listHeading]}>
        {year} expenses
      </Text>
      {yearExpenses.length > 0 ? (
        <View style={styles.list}>
          {yearExpenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              deleting={deleteExpense.isPending}
              onDelete={() => handleDelete(expense)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          {isLoading ? 'Loading expenses…' : `No expenses recorded for ${year}.`}
        </Text>
      )}

      <AppButton icon="refresh" variant="outline" onPress={() => refetch()}>
        Refresh
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  ytdBox: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ytdLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  ytdValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.royalRed,
  },
  yearTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.grayLight,
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  listHeading: {
    marginTop: spacing.md,
  },
  list: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  expenseInfo: {
    flex: 1,
    minWidth: 0,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  expenseMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  expenseActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deleteBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  deleteDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginVertical: spacing.md,
    fontSize: 14,
  },
});

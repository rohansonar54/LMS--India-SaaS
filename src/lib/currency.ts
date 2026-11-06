/**
 * Indian Rupee (₹) Currency Formatter
 * Formats numbers in Indian numbering system (e.g. ₹1,50,000, ₹25,000, ₹100)
 */
export function formatINR(amount: number | null | undefined, showDecimals: boolean = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }

  const rounded = Math.round(amount * 100) / 100;
  
  if (showDecimals) {
    return '₹' + rounded.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // If amount has cents/paise, show them; otherwise display whole number
  const hasPaise = rounded % 1 !== 0;
  return '₹' + rounded.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  });
}


import { useState, useMemo } from "react";
import { Plus, Trash2, Banknote, Calculator, CreditCard, Smartphone, QrCode, Wallet, Coins, Receipt, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  id: string;
  name: string;
  icon_type: string;
}

export interface SplitPayment {
  methodId: string;
  methodName: string;
  amount: number;
  receivedAmount?: number; // For cash change calculation
}

interface PDVPaymentSectionProps {
  paymentMethods: PaymentMethod[];
  totalAmount: number;
  onPaymentsChange: (payments: SplitPayment[]) => void;
  payments: SplitPayment[];
}

// Get icon for payment method
const getPaymentIcon = (iconType: string) => {
  switch (iconType) {
    case "money":
      return Banknote;
    case "credit":
    case "debit":
      return CreditCard;
    case "pix":
      return QrCode;
    case "voucher":
      return Receipt;
    case "wallet":
      return Wallet;
    case "mobile":
      return Smartphone;
    default:
      return Coins;
  }
};

export function PDVPaymentSection({
  paymentMethods,
  totalAmount,
  onPaymentsChange,
  payments,
}: PDVPaymentSectionProps) {
  const [isSplitMode, setIsSplitMode] = useState(false);

  // Calculate totals
  const totalPaid = useMemo(() => 
    payments.reduce((sum, p) => sum + p.amount, 0), 
    [payments]
  );
  
  const remaining = totalAmount - totalPaid;

  // Find cash payment methods (for change calculation)
  const cashMethods = useMemo(() => 
    paymentMethods.filter(m => 
      m.icon_type === "money" || 
      m.name.toLowerCase().includes("dinheiro") ||
      m.name.toLowerCase().includes("espécie")
    ),
    [paymentMethods]
  );

  const isCashPayment = (methodId: string) => 
    cashMethods.some(m => m.id === methodId);

  // Handle single payment selection via card click
  const handleSinglePayment = (method: PaymentMethod) => {
    onPaymentsChange([{
      methodId: method.id,
      methodName: method.name,
      amount: totalAmount,
    }]);
  };

  // Add split payment
  const addSplitPayment = () => {
    if (paymentMethods.length === 0) return;
    
    const defaultMethod = paymentMethods[0];
    const newPayment: SplitPayment = {
      methodId: defaultMethod.id,
      methodName: defaultMethod.name,
      amount: remaining > 0 ? remaining : 0,
    };
    
    onPaymentsChange([...payments, newPayment]);
  };

  // Update split payment
  const updateSplitPayment = (index: number, updates: Partial<SplitPayment>) => {
    const updated = [...payments];
    
    if (updates.methodId) {
      const method = paymentMethods.find(m => m.id === updates.methodId);
      updates.methodName = method?.name || "";
    }
    
    updated[index] = { ...updated[index], ...updates };
    onPaymentsChange(updated);
  };

  // Remove split payment
  const removeSplitPayment = (index: number) => {
    onPaymentsChange(payments.filter((_, i) => i !== index));
  };

  // Calculate change for cash payments
  const calculateChange = (payment: SplitPayment) => {
    if (!payment.receivedAmount || payment.receivedAmount <= payment.amount) return 0;
    return payment.receivedAmount - payment.amount;
  };

  // Toggle split mode
  const toggleSplitMode = () => {
    if (isSplitMode) {
      // Exit split mode - keep first payment or clear
      if (payments.length > 0) {
        onPaymentsChange([{ ...payments[0], amount: totalAmount }]);
      }
      setIsSplitMode(false);
    } else {
      // Enter split mode
      setIsSplitMode(true);
      if (payments.length === 0) {
        addSplitPayment();
      }
    }
  };

  // Quick amount buttons for split
  const quickAmounts = [10, 20, 50, 100];

  // Get selected payment for single mode
  const selectedPayment = payments[0];
  const selectedMethod = selectedPayment 
    ? paymentMethods.find(m => m.id === selectedPayment.methodId) 
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Forma de Pagamento</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleSplitMode}
          className="text-xs h-8 gap-1.5"
        >
          <Calculator className="w-3.5 h-3.5" />
          {isSplitMode ? "Pagamento Único" : "Dividir Conta"}
        </Button>
      </div>

      {!isSplitMode ? (
        // Single payment mode - Card buttons
        <div className="space-y-4">
          {/* Payment method cards */}
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map(method => {
              const Icon = getPaymentIcon(method.icon_type);
              const isSelected = selectedPayment?.methodId === method.id;
              
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => handleSinglePayment(method)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                    "hover:border-primary hover:bg-primary/5",
                    isSelected 
                      ? "border-primary bg-primary/10 shadow-md" 
                      : "border-border bg-card"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <Icon className={cn(
                    "w-6 h-6 transition-colors",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium text-center",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {method.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cash change calculation for single payment */}
          {selectedPayment && isCashPayment(selectedPayment.methodId) && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3 border">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-muted-foreground" />
                <Label className="font-medium">Valor Recebido</Label>
              </div>
              <Input
                type="number"
                step="0.01"
                min={totalAmount}
                placeholder={formatCurrency(totalAmount)}
                value={selectedPayment.receivedAmount || ""}
                onChange={(e) => updateSplitPayment(0, { 
                  receivedAmount: parseFloat(e.target.value) || 0 
                })}
                className="h-12 text-lg font-medium"
              />
              {selectedPayment.receivedAmount && selectedPayment.receivedAmount > totalAmount && (
                <div className="flex justify-between items-center bg-green-500/10 text-green-600 rounded-lg p-3">
                  <span className="font-medium">Troco:</span>
                  <span className="font-bold text-xl">
                    {formatCurrency(selectedPayment.receivedAmount - totalAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Payment status */}
          {selectedPayment && (
            <div className="bg-primary/5 rounded-xl p-3 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  <span className="font-medium">Pagamento: {selectedMethod?.name}</span>
                </div>
                <span className="font-bold text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Split payment mode
        <div className="space-y-3">
          {payments.map((payment, index) => (
            <div key={index} className="border-2 rounded-xl p-4 space-y-3 bg-card">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="h-6 w-6 flex items-center justify-center p-0 rounded-full">
                  {index + 1}
                </Badge>
                <Select 
                  value={payment.methodId} 
                  onValueChange={(v) => updateSplitPayment(index, { methodId: v })}
                >
                  <SelectTrigger className="flex-1 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {payments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeSplitPayment(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payment.amount || ""}
                  onChange={(e) => updateSplitPayment(index, { 
                    amount: parseFloat(e.target.value) || 0 
                  })}
                  className="h-10 flex-1 text-lg font-medium"
                  placeholder="0,00"
                />
              </div>

              {/* Quick amount buttons */}
              <div className="flex gap-1.5 flex-wrap">
                {quickAmounts.map(amount => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => updateSplitPayment(index, { amount })}
                  >
                    {formatCurrency(amount)}
                  </Button>
                ))}
                {remaining > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => updateSplitPayment(index, { amount: payment.amount + remaining })}
                  >
                    + Restante
                  </Button>
                )}
              </div>

              {/* Cash change calculation */}
              {isCashPayment(payment.methodId) && payment.amount > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 border">
                  <div className="flex gap-2 items-center">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Recebido:</span>
                    <Input
                      type="number"
                      step="0.01"
                      min={payment.amount}
                      value={payment.receivedAmount || ""}
                      onChange={(e) => updateSplitPayment(index, { 
                        receivedAmount: parseFloat(e.target.value) || 0 
                      })}
                      className="h-8 flex-1"
                      placeholder={formatCurrency(payment.amount)}
                    />
                  </div>
                  {calculateChange(payment) > 0 && (
                    <div className="flex justify-between text-sm bg-green-500/10 text-green-600 rounded-lg px-3 py-2">
                      <span className="font-medium">Troco:</span>
                      <span className="font-bold">{formatCurrency(calculateChange(payment))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add payment button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSplitPayment}
            className="w-full gap-2 h-10"
          >
            <Plus className="w-4 h-4" />
            Adicionar Pagamento
          </Button>

          {/* Summary */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-2 border">
            <div className="flex justify-between text-sm">
              <span>Total do Pedido:</span>
              <span className="font-semibold">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Pago:</span>
              <span className="font-semibold">{formatCurrency(totalPaid)}</span>
            </div>
            {remaining !== 0 && (
              <div className={cn(
                "flex justify-between font-bold text-base pt-2 border-t",
                remaining > 0 ? "text-destructive" : "text-green-600"
              )}>
                <span>{remaining > 0 ? "Falta:" : "Excedente:"}</span>
                <span>{formatCurrency(Math.abs(remaining))}</span>
              </div>
            )}
            {remaining === 0 && totalPaid > 0 && (
              <div className="pt-2 border-t">
                <Badge className="w-full justify-center bg-green-500/10 text-green-600 hover:bg-green-500/20 py-2">
                  <Check className="w-4 h-4 mr-2" />
                  Pagamento Completo
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

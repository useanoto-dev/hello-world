import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Banknote, Calculator } from "lucide-react";
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

  // Handle single payment mode
  const handleSinglePayment = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (method) {
      onPaymentsChange([{
        methodId,
        methodName: method.name,
        amount: totalAmount,
      }]);
    }
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Forma de Pagamento</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleSplitMode}
          className="text-xs h-7 gap-1"
        >
          <Calculator className="w-3 h-3" />
          {isSplitMode ? "Pagamento Único" : "Dividir Conta"}
        </Button>
      </div>

      {!isSplitMode ? (
        // Single payment mode
        <div className="space-y-3">
          <Select 
            value={payments[0]?.methodId || ""} 
            onValueChange={handleSinglePayment}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map(method => (
                <SelectItem key={method.id} value={method.id}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Cash change calculation for single payment */}
          {payments[0] && isCashPayment(payments[0].methodId) && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Valor Recebido</Label>
              </div>
              <Input
                type="number"
                step="0.01"
                min={totalAmount}
                placeholder={formatCurrency(totalAmount)}
                value={payments[0].receivedAmount || ""}
                onChange={(e) => updateSplitPayment(0, { 
                  receivedAmount: parseFloat(e.target.value) || 0 
                })}
                className="h-9"
              />
              {payments[0].receivedAmount && payments[0].receivedAmount > totalAmount && (
                <div className="flex justify-between items-center text-sm bg-green-500/10 text-green-600 rounded p-2">
                  <span className="font-medium">Troco:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(payments[0].receivedAmount - totalAmount)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Split payment mode
        <div className="space-y-3">
          {payments.map((payment, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <Select 
                  value={payment.methodId} 
                  onValueChange={(v) => updateSplitPayment(index, { methodId: v })}
                >
                  <SelectTrigger className="flex-1 h-8">
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
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeSplitPayment(index)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payment.amount || ""}
                  onChange={(e) => updateSplitPayment(index, { 
                    amount: parseFloat(e.target.value) || 0 
                  })}
                  className="h-8 flex-1"
                  placeholder="0,00"
                />
              </div>

              {/* Quick amount buttons */}
              <div className="flex gap-1 flex-wrap">
                {quickAmounts.map(amount => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2"
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
                    className="h-6 text-xs px-2"
                    onClick={() => updateSplitPayment(index, { amount: payment.amount + remaining })}
                  >
                    + Restante
                  </Button>
                )}
              </div>

              {/* Cash change calculation */}
              {isCashPayment(payment.methodId) && payment.amount > 0 && (
                <div className="bg-muted/50 rounded p-2 space-y-1">
                  <div className="flex gap-2 items-center">
                    <Banknote className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Recebido:</span>
                    <Input
                      type="number"
                      step="0.01"
                      min={payment.amount}
                      value={payment.receivedAmount || ""}
                      onChange={(e) => updateSplitPayment(index, { 
                        receivedAmount: parseFloat(e.target.value) || 0 
                      })}
                      className="h-6 text-xs flex-1"
                      placeholder={formatCurrency(payment.amount)}
                    />
                  </div>
                  {calculateChange(payment) > 0 && (
                    <div className="flex justify-between text-xs bg-green-500/10 text-green-600 rounded px-2 py-1">
                      <span>Troco:</span>
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
            className="w-full gap-1"
          >
            <Plus className="w-3 h-3" />
            Adicionar Pagamento
          </Button>

          {/* Summary */}
          <div className="bg-muted/30 rounded-lg p-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total do Pedido:</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Pago:</span>
              <span className="font-medium">{formatCurrency(totalPaid)}</span>
            </div>
            {remaining !== 0 && (
              <div className={`flex justify-between font-bold ${remaining > 0 ? "text-destructive" : "text-green-600"}`}>
                <span>{remaining > 0 ? "Falta:" : "Excedente:"}</span>
                <span>{formatCurrency(Math.abs(remaining))}</span>
              </div>
            )}
            {remaining === 0 && totalPaid > 0 && (
              <Badge variant="secondary" className="w-full justify-center bg-green-500/10 text-green-600">
                ✓ Pagamento Completo
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Payment as MercadoPagoPayment } from '@mercadopago/sdk-react';
import { MP_BRICK_LAYOUT_STYLES, toMpSdkCustomization } from '../../utils/mercadoPagoBrick';
import { CreditCardIcon, ExclamationCircleIcon, ShieldCheckIcon, SpinnerIcon } from '../icons';

const PAYMENT_METHODS = [
    { id: 'pix', label: 'Pix', hint: 'Aprovação imediata', accent: 'text-teal-400 bg-teal-500/10 border-teal-500/25' },
    { id: 'credit', label: 'Crédito', hint: 'Parcelamento', accent: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
    { id: 'debit', label: 'Débito', hint: 'À vista', accent: 'text-sky-400 bg-sky-500/10 border-sky-500/25' },
];

const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

export const PaymentBrickPanel = ({
    showBrick,
    brickKey,
    initialization,
    mpCustomization,
    onReady,
    onSubmit,
    total = 0,
    installmentSummary = null,
    paymentInstallmentsConfig = null,
    showTotal = true,
    className = '',
}) => {
    const showInstallmentPromo = mpCustomization?._showInstallmentPromo;
    const interestFreeInstallments = Number(paymentInstallmentsConfig?.interest_free_installments) || 4;
    const maxInstallments = Number(paymentInstallmentsConfig?.max_installments) || 10;

    return (
        <div
            className={`mp-custom-styles${showInstallmentPromo ? '' : ' mp-hide-installment-promo'} ${className}`.trim()}
        >
            <style>{MP_BRICK_LAYOUT_STYLES}</style>

            <div className="relative overflow-hidden rounded-2xl border border-gray-700/70 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800/90 mb-5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.1),transparent_55%)] pointer-events-none" />
                <div className="relative p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3.5 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                                <ShieldCheckIcon className="h-6 w-6 text-amber-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400/90">
                                    Pagamento protegido
                                </p>
                                <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                                    Meios de pagamento
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Transação processada com segurança pelo Mercado Pago
                                </p>
                            </div>
                        </div>

                        {showTotal && total > 0 && (
                            <div className="rounded-xl border border-gray-700/80 bg-black/30 px-4 py-3 sm:text-right shrink-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Valor do pedido
                                </p>
                                <p className="text-2xl font-black text-amber-400 tracking-tight">
                                    {formatCurrency(total)}
                                </p>
                                {installmentSummary && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        ou {installmentSummary}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                        {PAYMENT_METHODS.map((method) => (
                            <div
                                key={method.id}
                                className={`rounded-xl border px-2.5 py-2.5 sm:px-3 sm:py-3 text-center ${method.accent}`}
                            >
                                <p className="text-xs sm:text-sm font-bold text-white">{method.label}</p>
                                <p className="text-[10px] sm:text-[11px] opacity-80 mt-0.5 leading-tight">{method.hint}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mb-5">
                <div className="rounded-xl border border-blue-800/40 bg-blue-950/30 p-4 flex gap-3 items-start">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                        <ExclamationCircleIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-xs text-blue-100/90 leading-relaxed min-w-0">
                        <strong className="text-blue-200 block mb-1 text-sm">Pagamento via Pix</strong>
                        O QR Code e o código Copia e Cola aparecem nesta tela logo após você confirmar.
                    </div>
                </div>

                {installmentSummary ? (
                    <div className="rounded-xl border border-emerald-800/35 bg-emerald-950/20 p-4 flex gap-3 items-start">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                            <CreditCardIcon className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="text-xs text-emerald-100/90 leading-relaxed min-w-0">
                            <strong className="text-emerald-200 block mb-1 text-sm">Parcelamento no cartão</strong>
                            Até {interestFreeInstallments}x sem juros e até {maxInstallments}x no total.
                            Taxas adicionais dependem da bandeira, conforme Mercado Pago.
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-4 flex gap-3 items-start">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-700/50">
                            <CreditCardIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="text-xs text-gray-300 leading-relaxed min-w-0">
                            <strong className="text-gray-200 block mb-1 text-sm">Cartão à vista</strong>
                            Para este valor, o pagamento no cartão é feito em parcela única (1x).
                        </div>
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-3 sm:p-5 shadow-inner">
                {showBrick ? (
                    <MercadoPagoPayment
                        key={brickKey}
                        initialization={initialization}
                        customization={toMpSdkCustomization(mpCustomization)}
                        onReady={onReady}
                        onSubmit={onSubmit}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-4 gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl scale-150" />
                            <SpinnerIcon className="relative h-10 w-10 text-amber-500 animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-gray-200">Preparando checkout seguro</p>
                            <p className="text-xs text-gray-500 mt-1">Aguarde alguns instantes...</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                    <ShieldCheckIcon className="h-4 w-4 text-gray-600" />
                    Conexão criptografada SSL
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <CreditCardIcon className="h-4 w-4 text-gray-600" />
                    Dados do cartão não ficam na loja
                </span>
            </div>
        </div>
    );
};

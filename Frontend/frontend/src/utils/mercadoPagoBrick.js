/**
 * Helpers for Mercado Pago Payment Brick installment rules and UI fixes.
 */

export function getAllowedMaxInstallments(paymentInstallmentsConfig, amount) {
    const minInstallmentAmount = Number(paymentInstallmentsConfig?.min_installment_amount) || 0;
    const configuredMax = Number(paymentInstallmentsConfig?.max_installments) || 10;
    const total = Number(amount) || 0;
    return total >= minInstallmentAmount ? configuredMax : 1;
}

export function allowsStoreInstallments(paymentInstallmentsConfig, amount) {
    return getAllowedMaxInstallments(paymentInstallmentsConfig, amount) > 1;
}

const MP_BRICK_FORM_SUBMIT = 'Confirmar Pagamento';

const MP_BRICK_VISUAL_STYLE = {
    theme: 'dark',
    customVariables: {
        baseColor: '#fbbf24',
        baseColorFirstVariant: '#f59e0b',
        baseColorSecondVariant: '#d97706',
        errorColor: '#ef4444',
        successColor: '#34d399',
        successSecondaryColor: '#065f46',
        textPrimaryColor: '#f3f4f6',
        textSecondaryColor: '#9ca3af',
        inputBackgroundColor: '#1f2937',
        formBackgroundColor: 'transparent',
        outlinePrimaryColor: '#374151',
        outlineSecondaryColor: '#4b5563',
        buttonTextColor: '#111827',
        borderRadiusSmall: '8px',
        borderRadiusMedium: '12px',
        borderRadiusLarge: '14px',
        formPadding: '0px',
        inputVerticalPadding: '12px',
        inputHorizontalPadding: '14px',
        fontSizeSmall: '13px',
        fontSizeMedium: '14px',
        fontWeightSemiBold: '600',
    },
};

export function buildMpPaymentCustomization({ paymentInstallmentsConfig, amount }) {
    const allowedMaxInstallments = getAllowedMaxInstallments(paymentInstallmentsConfig, amount);
    const showInstallmentPromo = allowedMaxInstallments > 1;

    return {
        hideFormTitle: true,
        paymentMethods: {
            excludedPaymentTypes: ['ticket'],
            bankTransfer: 'all',
            creditCard: 'all',
            debitCard: 'all',
            minInstallments: 1,
            maxInstallments: allowedMaxInstallments,
        },
        visual: {
            texts: {
                formSubmit: MP_BRICK_FORM_SUBMIT,
                emailSectionTitle: 'Dados para o comprovante',
                installmentsSectionTitle: 'Escolha o parcelamento',
                selectInstallments: 'Selecione as parcelas',
                selectIssuerBank: 'Selecione o banco emissor',
                paymentMethods: {
                    creditCardTitle: 'Cartão de crédito',
                    debitCardTitle: 'Cartão de débito',
                    newCreditCardTitle: 'Novo cartão de crédito',
                    newDebitCardTitle: 'Novo cartão de débito',
                },
            },
            style: MP_BRICK_VISUAL_STYLE,
        },
        _showInstallmentPromo: showInstallmentPromo,
    };
}

/** Strip internal flags before passing to Mercado Pago SDK. */
export function toMpSdkCustomization(customization) {
    if (!customization) return customization;
    const { _showInstallmentPromo, ...sdkCustomization } = customization;
    return sdkCustomization;
}

const INSTALLMENT_PROMO_REGEX = /parcelamento\s+dispon[ií]vel/i;

function hideInstallmentPromoInRoot(root) {
    if (!root) return;

    const candidates = root.querySelectorAll('span, p, small, div');
    candidates.forEach((el) => {
        if (el.children.length > 0) return;
        const text = (el.textContent || '').trim();
        if (!INSTALLMENT_PROMO_REGEX.test(text)) return;

        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');

        const parent = el.parentElement;
        if (parent && parent !== root) {
            const onlyPromo =
                Array.from(parent.children).every((child) => {
                    const childText = (child.textContent || '').trim();
                    return !childText || INSTALLMENT_PROMO_REGEX.test(childText) || child.style.display === 'none';
                });
            if (onlyPromo) {
                parent.style.setProperty('display', 'none', 'important');
            }
        }
    });
}

let activePromoObserver = null;

/**
 * Hides MP's default "Parcelamento disponível" badge when store rules allow only 1x.
 * Returns cleanup for observers/timeouts.
 */
export function attachMpInstallmentPromoHide(showInstallmentPromo, rootSelector = '.mp-custom-styles') {
    if (activePromoObserver) {
        activePromoObserver.disconnect();
        activePromoObserver = null;
    }

    if (showInstallmentPromo) {
        return () => {};
    }

    const runHide = () => {
        document.querySelectorAll(rootSelector).forEach(hideInstallmentPromoInRoot);
    };

    runHide();

    const roots = Array.from(document.querySelectorAll(rootSelector));
    if (roots.length > 0) {
        activePromoObserver = new MutationObserver(runHide);
        roots.forEach((root) => {
            activePromoObserver.observe(root, { childList: true, subtree: true, characterData: true });
        });
    }

    const retryTimers = [100, 400, 1000, 2000].map((ms) => setTimeout(runHide, ms));

    return () => {
        retryTimers.forEach(clearTimeout);
        if (activePromoObserver) {
            activePromoObserver.disconnect();
            activePromoObserver = null;
        }
    };
}

export const MP_BRICK_LAYOUT_STYLES = `
    .mp-custom-styles {
        --mp-brand-glow: rgba(251, 191, 36, 0.12);
    }

    .mp-custom-styles #paymentBrick_container,
    .mp-custom-styles [id*="paymentBrick"] {
        width: 100%;
    }

    .mp-custom-styles input,
    .mp-custom-styles select,
    .mp-custom-styles textarea {
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .mp-custom-styles .mp-formAction,
    .mp-custom-styles [class*="formAction"] {
        display: flex !important;
        justify-content: center !important;
        width: 100% !important;
        margin-top: 8px !important;
        padding-top: 4px !important;
    }

    .mp-custom-styles button[type="submit"],
    .mp-custom-styles [data-testid="submit-button"],
    .mp-custom-styles .mp-button {
        width: 100% !important;
        max-width: 420px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        border-radius: 12px !important;
        min-height: 48px !important;
        font-weight: 700 !important;
        letter-spacing: 0.01em !important;
        box-shadow: 0 8px 24px var(--mp-brand-glow) !important;
        transition: transform 0.15s ease, box-shadow 0.15s ease !important;
    }

    .mp-custom-styles button[type="submit"]:hover,
    .mp-custom-styles [data-testid="submit-button"]:hover,
    .mp-custom-styles .mp-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 28px rgba(251, 191, 36, 0.2) !important;
    }

    .mp-custom-styles.mp-hide-installment-promo [class*="valueProp"],
    .mp-custom-styles.mp-hide-installment-promo [class*="ValueProp"],
    .mp-custom-styles.mp-hide-installment-promo [class*="promotion"],
    .mp-custom-styles.mp-hide-installment-promo [class*="Promotion"] {
        display: none !important;
        visibility: hidden !important;
    }

    .mp-custom-styles.mp-hide-installment-promo [class*="valueProp"],
    .mp-custom-styles.mp-hide-installment-promo [class*="ValueProp"] {
        background: transparent !important;
        padding: 0 !important;
        min-height: 0 !important;
    }
`;

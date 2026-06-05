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
    },
};

export function buildMpPaymentCustomization({ paymentInstallmentsConfig, amount }) {
    const allowedMaxInstallments = getAllowedMaxInstallments(paymentInstallmentsConfig, amount);
    const showInstallmentPromo = allowedMaxInstallments > 1;

    return {
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
    .mp-custom-styles.mp-hide-installment-promo [class*="valueProp"],
    .mp-custom-styles.mp-hide-installment-promo [class*="ValueProp"],
    .mp-custom-styles.mp-hide-installment-promo [class*="promotion"],
    .mp-custom-styles.mp-hide-installment-promo [class*="Promotion"] {
        display: none !important;
        visibility: hidden !important;
    }

    @media (min-width: 1024px) {
        .mp-custom-styles .mp-formAction,
        .mp-custom-styles [class*="formAction"] {
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
        }

        .mp-custom-styles button[type="submit"],
        .mp-custom-styles [data-testid="submit-button"],
        .mp-custom-styles .mp-button {
            width: 100% !important;
            max-width: 350px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            border-radius: 8px !important;
        }
    }
`;

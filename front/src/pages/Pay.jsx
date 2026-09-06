// src/pages/Pay.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { isPreviewMode } from '../services/dataMode';
import { paymentInfo as previewPaymentInfo, courseCheckoutSession, previewMutation } from '../services/previewData';
import { useTour } from '../hooks/useTour';

const currencySymbol = (currency) => {
  const c = String(currency || '').toLowerCase();
  if (c === 'mad') return 'MAD ';
  return '$';
};

// ---------- Main Pay Component ----------
const Pay = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const navigate = useNavigate();

  const urlSessionId = useMemo(
    () => new URLSearchParams(window.location.search).get('session_id'),
    []
  );
  const isCheckoutReturn = !!urlSessionId;

  const [checkoutStatus, setCheckoutStatus] = useState(
    isCheckoutReturn ? 'confirming' : 'idle'
  );
  const [loading, setLoading] = useState(!isCheckoutReturn);
  const [error, setError] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [stripeButtonLoading, setStripeButtonLoading] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error(t('pay.pleaseLogin'));
      navigate('/login');
      return;
    }

    if (isCheckoutReturn && urlSessionId) {
      let cancelled = false;

      const confirmCheckout = async () => {
        try {
          const { data } = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/user/payments/confirm-checkout?session_id=${urlSessionId}&courseId=${courseId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (cancelled) return;

          if (data.success) {
            setCheckoutStatus('success');
            toast.success(t('pay.enrollmentSuccess'));
            setTimeout(() => navigate(`/course/${courseId}`), 1500);
          } else {
            setCheckoutStatus('error');
            setError(data.message);
            toast.error(data.message || t('pay.enrollmentConfirmFailed'));
          }
        } catch (err) {
          if (cancelled) return;
          console.error('Checkout confirmation error:', err);
          setCheckoutStatus('error');
          setError(err.response?.data?.message || t('pay.confirmEnrollmentFailed'));
          toast.error(err.response?.data?.message || t('pay.confirmEnrollmentFailed'));
        }
      };

      confirmCheckout();
      return () => { cancelled = true; };
    }

    const fetchPaymentInfo = async () => {
      try {
        setLoading(true);
        const paymentInfoRes = isPreviewMode
          ? await previewPaymentInfo(courseId)
          : await axios.get(
              `${import.meta.env.VITE_BACKEND_URL}/api/user/courses/${courseId}/payment-info`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

        if (!paymentInfoRes.data.success) {
          throw new Error(paymentInfoRes.data.message);
        }

        setPaymentInfo(paymentInfoRes.data.data);
      } catch (err) {
        console.error('Payment initialization error:', err);
        setError(err.response?.data?.message || err.message || t('pay.paymentInitFailed'));
        toast.error(err.response?.data?.message || t('pay.paymentSetupFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentInfo();
  }, [courseId, navigate, isCheckoutReturn, urlSessionId]);

  const handleStripeClick = async () => {
    if (isPreviewMode) {
      setStripeButtonLoading(true);
      setTimeout(() => {
        setStripeButtonLoading(false);
        toast.success(t('pay.enrollmentSuccess'));
        setTimeout(() => navigate(`/course/${courseId}`), 2000);
      }, 800);
      return;
    }

    setStripeButtonLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/payments/create-checkout-session`,
        { courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.message || t('pay.checkoutSessionFailed'));
        setStripeButtonLoading(false);
      }
    } catch (err) {
      console.error('Checkout session error:', err);
      toast.error(err.response?.data?.message || t('pay.checkoutStartFailed'));
      setStripeButtonLoading(false);
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error(t('pay.enterCoupon'));
      return;
    }

    setCouponLoading(true);
    try {
      if (isPreviewMode) {
        previewMutation('Applying coupon');
        setCouponLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/payments/coupon-enrollment`,
        { courseId, couponCode: couponCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(t('pay.couponApplied'));
        setTimeout(() => navigate(`/course/${courseId}`), 250);
      } else {
        toast.error(data.message || t('pay.couponFailed'));
      }
    } catch (err) {
      console.error('Coupon error:', err);
      toast.error(err.response?.data?.message || t('pay.couponApplyFailed'));
    } finally {
      setCouponLoading(false);
    }
  };

  useTour(!loading && !!paymentInfo && checkoutStatus === 'idle');

  if (checkoutStatus === 'confirming' || checkoutStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center animate-fade-in">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-slate-600">
            {checkoutStatus === 'success'
              ? t('pay.enrollmentSuccess')
              : t('pay.confirmingPayment')}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center animate-fade-in">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-slate-600">{t('pay.preparingPayment')}</p>
        </div>
      </div>
    );
  }

  if (checkoutStatus === 'error' || error || !paymentInfo) {
    const isInstructorNotConfigured = error?.includes('instructor has not completed their payment setup');
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 card max-w-md animate-fade-up">
          <svg className="mx-auto h-12 w-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            {isInstructorNotConfigured ? t('pay.stripeSetupRequired') : t('pay.paymentUnavailable')}
          </h2>
          <p className="mt-2 text-slate-600">
            {isInstructorNotConfigured
              ? t('pay.stripeSetupText')
              : error || t('pay.paymentInfoUnavailable')}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 btn-brand px-4 py-2"
          >
            {t('pay.goBack')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 animate-fade-up">
          <span className="eyebrow">{t('pay.checkout')}</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{t('pay.completePurchase')}</h1>
          <p className="mt-2 text-slate-600">{t('pay.secureCheckout')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 hover:shadow-soft-lg transition border-2 border-transparent hover:border-emerald-200/80">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5 3H12V0h1.5v3zM12 10.5h1.5V6H12v4.5zm6-6.75L16.5 2.25 15 3.75 16.5 5.25 18 3.75zM21 6h-3v1.5h3V6z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-slate-900">{t('pay.cardTitle')}</h3>
                <p className="text-sm text-slate-500">{t('pay.cardSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={handleStripeClick}
              disabled={stripeButtonLoading}
              data-tour="stripe-pay"
              className="w-full btn-brand py-2 px-4 flex items-center justify-center"
            >
              {stripeButtonLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('pay.redirectingToStripe')}
                </>
              ) : (
                t('pay.payWithStripe')
              )}
            </button>
            <p className="mt-3 text-xs text-slate-500 text-center">
              {t('pay.redirectNote')}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-6 border-2 border-dashed border-slate-200 hover:border-emerald-300 transition">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-5-5A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-slate-900">{t('pay.couponTitle')}</h3>
                <p className="text-sm text-slate-500">{t('pay.couponSubtitle')}</p>
              </div>
            </div>

            <form onSubmit={handleCouponSubmit} className="space-y-3">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={t('pay.couponPlaceholder')}
                data-tour="coupon-input"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
                disabled={couponLoading}
              />
              <button
                type="submit"
                disabled={couponLoading}
                className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
              >
                {couponLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('pay.applying')}
                  </>
                ) : (
                  t('pay.applyCoupon')
                )}
              </button>
            </form>

            <p className="mt-3 text-xs text-slate-500 text-center">
              {t('pay.couponNote')}
            </p>
          </div>
        </div>

        <div className="mt-8 card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('pay.orderSummary')}</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-700">{paymentInfo.courseName}</p>
              <p className="text-sm text-slate-500">{t('pay.instructor', { name: paymentInfo.instructorName })}</p>
            </div>
            <span className="text-2xl font-bold text-emerald-700">
              {currencySymbol(paymentInfo.currency)}{paymentInfo.price?.toFixed(2)}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-3" data-tour="pay-note">
            {t('pay.priceNote')}
          </p>
        </div>

        <p className="mt-6 text-xs text-slate-500 text-center">
          {t('pay.paymentsSecure')}
        </p>
      </div>
    </div>
  );
};

export default Pay;

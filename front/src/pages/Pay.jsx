// src/pages/Pay.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';
import { isPreviewMode } from '../services/dataMode';
import { paymentInfo as previewPaymentInfo, paymentIntent, previewMutation } from '../services/previewData';

// ---------- Modal Component ----------
const PaymentModal = ({ isOpen, onClose, courseId, price, courseName, instructorName, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const cardElement = elements.getElement(CardElement);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      try {
        if (isPreviewMode) {
          previewMutation('Confirming enrollment');
          return;
        }
        const token = localStorage.getItem('token');
        const { data } = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/user/payments/confirm-enrollment`,
          { paymentIntentId: paymentIntent.id, courseId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (data.success) {
          toast.success('🎉 Enrollment successful! Redirecting to course...');
          setTimeout(() => navigate(`/course/${courseId}`), 2000);
        } else {
          toast.error(data.message || 'Enrollment failed');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to confirm enrollment');
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-900">Complete Payment</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Course summary */}
          <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl mb-6">
            <p className="text-sm text-emerald-700 font-medium">Course</p>
            <p className="text-lg font-semibold text-slate-900">{courseName}</p>
            <p className="text-sm text-slate-600 mt-1">Instructor: {instructorName}</p>
            <div className="mt-2 pt-2 border-t border-emerald-100 flex justify-between">
              <span className="text-slate-700">Total</span>
              <span className="text-2xl font-bold text-slate-900">${price?.toFixed(2)}</span>
            </div>
          </div>

          {/* Stripe Form */}
          <form onSubmit={handleSubmit}>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#0f172a',
                      '::placeholder': { color: '#94a3b8' },
                    },
                  },
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!stripe || loading}
              className="mt-6 w-full btn-brand py-3 px-4"
            >
              {loading ? 'Processing...' : `Pay $${price?.toFixed(2)}`}
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-500 text-center">
             Payments are processed securely via Stripe.
          </p>
        </div>
      </div>
    </div>
  );
};

// ---------- Main Pay Component ----------
const Pay = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stripeButtonLoading, setStripeButtonLoading] = useState(false);

    // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  // Fetch payment info and create PaymentIntent
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Please login first');
          navigate('/login');
          return;
        }

        // 1. Get payment info (Stripe public key, price, etc.)
        const paymentInfoRes = isPreviewMode
          ? await previewPaymentInfo(courseId)
          : await axios.get(
              `${import.meta.env.VITE_BACKEND_URL}/api/user/courses/${courseId}/payment-info`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

        if (!paymentInfoRes.data.success) {
          throw new Error(paymentInfoRes.data.message);
        }

        const info = paymentInfoRes.data.data;
        setPaymentInfo(info);

        // 2. Initialize Stripe with the instructor's publishable key
        // In preview mode we skip the real Stripe SDK and simulate checkout.
        if (isPreviewMode) {
          setStripePromise(Promise.resolve(null));
        } else {
          setStripePromise(loadStripe(info.stripePublicKey));
        }

        // 3. Create PaymentIntent on backend
        const intentRes = isPreviewMode
          ? await paymentIntent(courseId)
          : await axios.post(
              `${import.meta.env.VITE_BACKEND_URL}/api/user/payments/create-payment-intent`,
              { courseId },
              { headers: { Authorization: `Bearer ${token}` } }
            );

        if (!intentRes.data.success) {
          throw new Error(intentRes.data.message);
        }

        setClientSecret(intentRes.data.clientSecret);
      } catch (err) {
        console.error('Payment initialization error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to initialize payment');
        toast.error(err.response?.data?.message || 'Payment setup failed');
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [courseId, navigate]);

  // Handle Stripe button click
  const handleStripeClick = () => {
    if (isPreviewMode) {
      // Simulate a successful checkout without Stripe or the backend.
      setStripeButtonLoading(true);
      setTimeout(() => {
        setStripeButtonLoading(false);
        toast.success('🎉 Enrollment successful! Redirecting to course...');
        setTimeout(() => navigate(`/course/${courseId}`), 2000);
      }, 800);
      return;
    }

    if (!clientSecret) {
      toast.error('Payment not ready yet. Please wait.');
      return;
    }
    setStripeButtonLoading(true);
    // Simulate a short delay for UX
    setTimeout(() => {
      setStripeButtonLoading(false);
      setIsModalOpen(true);
    }, 800);
  };
  // Handle coupon application
  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
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
        toast.success('Coupon applied! Enrolling you now...');
        // Redirect to course page after short delay
        setTimeout(() => navigate(`/course/${courseId}`), 250);
      } else {
        toast.error(data.message || 'Failed to apply coupon');
      }
    } catch (err) {
      console.error('Coupon error:', err);
      toast.error(err.response?.data?.message || 'Coupon application failed');
    } finally {
      setCouponLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center animate-fade-in">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Preparing secure payment...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentInfo || !clientSecret || !stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 card max-w-md animate-fade-up">
          <svg className="mx-auto h-12 w-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-slate-800">{error || 'Payment information unavailable'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 btn-brand px-4 py-2"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-up">
          <span className="eyebrow">Checkout</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Choose Payment Method</h1>
          <p className="mt-2 text-slate-600">Secure and fast checkout</p>
        </div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stripe Card */}
          <div className="card p-6 hover:shadow-soft-lg transition border-2 border-transparent hover:border-emerald-200/80">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5 3H12V0h1.5v3zM12 10.5h1.5V6H12v4.5zm6-6.75L16.5 2.25 15 3.75 16.5 5.25 18 3.75zM21 6h-3v1.5h3V6z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-slate-900">Credit / Debit Card</h3>
                <p className="text-sm text-slate-500">Pay securely with Stripe</p>
              </div>
            </div>
            <button
              onClick={handleStripeClick}
              disabled={stripeButtonLoading}
              className="w-full btn-brand py-2 px-4 flex items-center justify-center"
            >
              {stripeButtonLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Initializing...
                </>
              ) : (
                'Pay with Stripe'
              )}
            </button>
          </div>

          {/* Coupon Placeholder */}
          <div className="bg-white rounded-2xl shadow-soft p-6 border-2 border-dashed border-slate-200 hover:border-emerald-300 transition">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-5-5A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-slate-900">Coupon code</h3>
                <p className="text-sm text-slate-500">Enter a valid coupon code</p>
              </div>
            </div>

            <form onSubmit={handleCouponSubmit} className="space-y-3">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="e.g. SUMMER2025"
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
                    Applying...
                  </>
                ) : (
                  'Apply Coupon'
                )}
              </button>
            </form>

            <p className="mt-3 text-xs text-slate-500 text-center">
              If valid, you'll be enrolled immediately for free.
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="mt-8 card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-700">{paymentInfo.courseName}</p>
              <p className="text-sm text-slate-500">Instructor: {paymentInfo.instructorName}</p>
            </div>
            <span className="text-2xl font-bold text-emerald-700">${paymentInfo.price?.toFixed(2)}</span>
          </div>
        </div>

        {/* Security Note */}
        <p className="mt-6 text-xs text-slate-500 text-center">
           All payments are encrypted and processed securely. We never store your card details.
        </p>
      </div>

      {/* Stripe Modal */}
      {stripePromise && clientSecret && (
        <Elements stripe={stripePromise}>
          <PaymentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            courseId={courseId}
            price={paymentInfo.price}
            courseName={paymentInfo.courseName}
            instructorName={paymentInfo.instructorName}
            clientSecret={clientSecret}
          />
        </Elements>
      )}
    </div>
  );
};

export default Pay;
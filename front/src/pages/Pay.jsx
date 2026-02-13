// src/pages/Pay.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Complete Payment</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Course summary */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-blue-800 font-medium">Course</p>
            <p className="text-lg font-semibold text-gray-900">{courseName}</p>
            <p className="text-sm text-gray-600 mt-1">Instructor: {instructorName}</p>
            <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between">
              <span className="text-gray-700">Total</span>
              <span className="text-2xl font-bold text-gray-900">${price?.toFixed(2)}</span>
            </div>
          </div>

          {/* Stripe Form */}
          <form onSubmit={handleSubmit}>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': { color: '#aab7c4' },
                    },
                  },
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!stripe || loading}
              className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Processing...' : `Pay $${price?.toFixed(2)}`}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500 text-center">
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
        const paymentInfoRes = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/user/courses/${courseId}/payment-info`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!paymentInfoRes.data.success) {
          throw new Error(paymentInfoRes.data.message);
        }

        const info = paymentInfoRes.data.data;
        setPaymentInfo(info);

        // 2. Initialize Stripe with the instructor's publishable key
        setStripePromise(loadStripe(info.stripePublicKey));

        // 3. Create PaymentIntent on backend
        const intentRes = await axios.post(
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Preparing secure payment...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentInfo || !clientSecret || !stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-gray-800">{error || 'Payment information unavailable'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Choose Payment Method</h1>
          <p className="mt-2 text-gray-600">Secure and fast checkout</p>
        </div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stripe Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 border-2 border-transparent hover:border-blue-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5 3H12V0h1.5v3zM12 10.5h1.5V6H12v4.5zm6-6.75L16.5 2.25 15 3.75 16.5 5.25 18 3.75zM21 6h-3v1.5h3V6z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Credit / Debit Card</h3>
                <p className="text-sm text-gray-500">Pay securely with Stripe</p>
              </div>
            </div>
            <button
              onClick={handleStripeClick}
              disabled={stripeButtonLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
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

          {/* Coupon Placeholder (future feature) */}
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center opacity-60">
            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-5-5A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="text-gray-500 font-medium">Coupon / Discount</p>
            <p className="text-xs text-gray-400 mt-1">Coming soon</p>
          </div>
        </div>

        {/* Order Summary (optional) */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-700">{paymentInfo.courseName}</p>
              <p className="text-sm text-gray-500">Instructor: {paymentInfo.instructorName}</p>
            </div>
            <span className="text-2xl font-bold text-gray-900">${paymentInfo.price?.toFixed(2)}</span>
          </div>
        </div>

        {/* Security Note */}
        <p className="mt-6 text-xs text-gray-500 text-center">
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
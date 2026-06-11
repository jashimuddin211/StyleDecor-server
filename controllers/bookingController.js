const { getBookingsCollection, getTransactionsCollection } = require('../config/db');
const { ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51OwWnK2Mw3qFkL1wWvO1vU3v4v5v6v7v8v9v0vAB1C2D3E4F5G6H7I8J9K0L');

const getBookings = async (req, res, next) => {
  try {
    const email = req.query.email;
    const decoratorEmail = req.query.decoratorEmail;

    const decodedEmail = req.decoded.email;
    if (email && email.toLowerCase() !== decodedEmail.toLowerCase()) {
      return res.status(403).send({ error: true, message: 'Forbidden access: Email mismatch' });
    }
    if (decoratorEmail && decoratorEmail.toLowerCase() !== decodedEmail.toLowerCase()) {
      return res.status(403).send({ error: true, message: 'Forbidden access: Email mismatch' });
    }

    let query = {};
    if (email) {
      query.userEmail = { $regex: new RegExp(`^${email}$`, 'i') };
    }
    if (decoratorEmail) {
      query.decoratorEmail = { $regex: new RegExp(`^${decoratorEmail}$`, 'i') };
    }

    const bookingsCollection = getBookingsCollection();
    const result = await bookingsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (err) {
    next(err);
  }
};

const createBooking = async (req, res, next) => {
  try {
    const booking = req.body;

    if (booking.userEmail?.toLowerCase() !== req.decoded.email?.toLowerCase()) {
      return res.status(403).send({ error: true, message: 'Forbidden access: Email mismatch' });
    }

    booking.status = "Pending Assignment";
    booking.paymentStatus = "Unpaid";
    booking.createdAt = new Date();

    const bookingsCollection = getBookingsCollection();
    const result = await bookingsCollection.insertOne(booking);

    res.send({
      success: true,
      insertedId: result.insertedId
    });
  } catch (err) {
    next(err);
  }
};

const deleteBooking = async (req, res, next) => {
  try {
    const id = req.params.id;
    const bookingsCollection = getBookingsCollection();
    const result = await bookingsCollection.deleteOne({
      _id: new ObjectId(id)
    });
    res.send(result);
  } catch (err) {
    next(err);
  }
};

const assignDecorator = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { decoratorId, decoratorName, decoratorEmail } = req.body;
    
    const bookingsCollection = getBookingsCollection();
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          decoratorId,
          decoratorName,
          decoratorEmail,
          status: "Assigned"
        }
      }
    );
    res.send({ success: true, result });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    
    const bookingsCollection = getBookingsCollection();
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    res.send({ success: true, result });
  } catch (err) {
    next(err);
  }
};

const manualPay = async (req, res, next) => {
  try {
    const id = req.params.id;
    const bookingsCollection = getBookingsCollection();
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          paymentStatus: "Paid",
          paidAt: new Date(),
          transactionId: "TXN-" + Date.now()
        }
      }
    );

    res.send({
      success: true,
      message: "Payment Successful",
      result
    });
  } catch (err) {
    next(err);
  }
};

const createCheckoutSession = async (req, res, next) => {
  try {
    const { bookingId, serviceName, price, userEmail } = req.body;

    if (!bookingId || !price) {
      return res.status(400).send({ error: "Missing required booking details" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'bdt',
            product_data: {
              name: serviceName || "Decoration Service",
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:5173/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`,
      cancel_url: `http://localhost:5173/dashboard/payment-history`,
      metadata: {
        bookingId,
        userEmail: userEmail || "",
        serviceName: serviceName || ""
      }
    });

    res.send({ url: session.url });
  } catch (err) {
    console.error("Stripe Session Error:", err);
    res.status(500).send({ error: err.message });
  }
};

const confirmPayment = async (req, res, next) => {
  try {
    const { bookingId, sessionId } = req.body;

    if (!bookingId || !sessionId) {
      return res.status(400).send({ error: "Missing bookingId or sessionId" });
    }

    const transactionsCollection = getTransactionsCollection();
    const bookingsCollection = getBookingsCollection();

    const existingTxn = await transactionsCollection.findOne({ stripeSessionId: sessionId });
    if (existingTxn) {
      return res.send({ success: true, message: "Payment already confirmed", result: existingTxn });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(400).send({ error: "Stripe session has not been paid yet" });
    }

    const transactionId = session.payment_intent || ("TXN-STRI-" + Date.now());

    const bookingUpdate = await bookingsCollection.updateOne(
      { _id: new ObjectId(bookingId) },
      {
        $set: {
          paymentStatus: "Paid",
          paidAt: new Date(),
          transactionId: transactionId,
          stripeSessionId: sessionId
        }
      }
    );

    const transactionInfo = {
      bookingId,
      stripeSessionId: sessionId,
      transactionId,
      userEmail: session.metadata.userEmail || "",
      serviceName: session.metadata.serviceName || "",
      amount: session.amount_total / 100,
      currency: session.currency,
      paymentStatus: "Paid",
      paidAt: new Date(),
      paymentMethod: "Stripe Card"
    };

    const txnInsert = await transactionsCollection.insertOne(transactionInfo);

    res.send({
      success: true,
      message: "Payment confirmed and stored successfully",
      bookingUpdate,
      txnInsert,
      transactionInfo
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBookings,
  createBooking,
  deleteBooking,
  assignDecorator,
  updateStatus,
  manualPay,
  createCheckoutSession,
  confirmPayment
};

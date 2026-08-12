import { useState } from "react";

function Feedback() {

  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    setSubmitted(true);
    setMessage("");
    setRating(5);
  };

  return (
    <section className="page">

      <div className="page-header">

        <p className="tagline">
          CUSTOMER FEEDBACK
        </p>

        <h1>Give Your Feedback</h1>

        <p>
          Your feedback helps us understand your experience
          and improve our services.
        </p>

      </div>

      <form
        className="feedback-form"
        onSubmit={handleSubmit}
      >

        <label>How would you rate your experience?</label>

        <div className="rating">

          {[1, 2, 3, 4, 5].map((number) => (

            <button
              type="button"
              key={number}
              className={
                rating >= number
                  ? "star selected"
                  : "star"
              }
              onClick={() => setRating(number)}
            >
              ★
            </button>

          ))}

        </div>

        <p className="rating-text">
          Your rating: {rating}/5
        </p>

        <label>
          Tell us about your experience
        </label>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your feedback here..."
          required
        />

        <button
          type="submit"
          className="primary-btn submit-btn"
        >
          Submit Feedback
        </button>

        {submitted && (
          <p className="success">
            ✓ Thank you! Your feedback has been submitted.
          </p>
        )}

      </form>

    </section>
  );
}

export default Feedback;
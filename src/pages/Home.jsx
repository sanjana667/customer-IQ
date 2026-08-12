import { Link } from "react-router-dom";

function Home() {
  return (
    <section className="hero">

      <p className="tagline">
        CUSTOMER FEEDBACK INTELLIGENCE
      </p>

      <h1>
        Turn Customer Feedback Into Powerful Insights
      </h1>

      <p className="description">
        Understand what your customers think, identify important
        trends, and make better business decisions using customer feedback.
      </p>

      <div className="buttons">

        <Link
          to="/feedback"
          className="primary-btn"
        >
          Give Feedback
        </Link>

        <Link
          to="/dashboard"
          className="secondary-btn"
        >
          View Dashboard
        </Link>

      </div>

    </section>
  );
}

export default Home;
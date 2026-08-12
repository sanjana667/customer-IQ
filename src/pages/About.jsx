function About() {

  return (
    <section className="page about">

      <div className="page-header">

        <p className="tagline">
          ABOUT CUSTOMERIQ
        </p>

        <h1>About CustomerIQ</h1>

      </div>

      <div className="about-content">

        <h2>What is CustomerIQ?</h2>

        <p>
          CustomerIQ is a customer feedback intelligence
          platform designed to help businesses understand
          their customers better.
        </p>

        <p>
          It collects customer feedback and transforms it
          into useful information through ratings, summaries
          and insights.
        </p>

        <h2>Our Goal</h2>

        <p>
          Our goal is to help businesses make better
          decisions by understanding what their customers
          really think.
        </p>

        <div className="features">

          <div>
            <span>📊</span>
            <h3>Analyze Feedback</h3>
          </div>

          <div>
            <span>💡</span>
            <h3>Find Insights</h3>
          </div>

          <div>
            <span>📈</span>
            <h3>Improve Decisions</h3>
          </div>

        </div>

      </div>

    </section>
  );
}

export default About;
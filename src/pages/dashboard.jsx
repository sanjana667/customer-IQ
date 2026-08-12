function Dashboard() {

  return (
    <section className="page dashboard">

      <div className="page-header">

        <p className="tagline">
          CUSTOMER FEEDBACK INTELLIGENCE
        </p>

        <h1>Customer Feedback Dashboard</h1>

        <p>
          Overview of customer feedback and satisfaction
        </p>

      </div>

      <div className="dashboard-cards">

        <div className="dashboard-card">
          <h2>120</h2>
          <p>Total Feedback</p>
        </div>

        <div className="dashboard-card">
          <h2>4.5 ⭐</h2>
          <p>Average Rating</p>
        </div>

        <div className="dashboard-card positive">
          <h2>85%</h2>
          <p>Positive Feedback</p>
        </div>

        <div className="dashboard-card negative">
          <h2>15%</h2>
          <p>Negative Feedback</p>
        </div>

      </div>

      <div className="summary">

        <h2>Feedback Summary</h2>

        <div className="summary-row">
          <span>Excellent</span>
          <strong>60%</strong>
        </div>

        <div className="summary-row">
          <span>Good</span>
          <strong>25%</strong>
        </div>

        <div className="summary-row">
          <span>Average</span>
          <strong>10%</strong>
        </div>

        <div className="summary-row">
          <span>Poor</span>
          <strong>5%</strong>
        </div>

      </div>

    </section>
  );
}

export default Dashboard;
import React from "react";
import "./Home.css";

function Home() {
  return (
    <div className="home">

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          ResQ
        </div>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-buttons">
          <a href="/login" className="login-btn">
            Login
          </a>

          <a href="/signup" className="signup-btn">
            Sign Up
          </a>
        </div>
      </nav>


      {/* Hero Section */}
      <section className="hero">

        <div className="hero-content">

          <p className="hero-label">
            INTELLIGENT DISASTER RISK & RELOCATION PLATFORM
          </p>

          <h1>
            Identify Risk. <span>Protect Lives.</span>
          </h1>

          <p className="hero-description">
            ResQ uses intelligent risk analysis and GIS-based mapping
            to identify hazardous zones, assess vulnerable habitations,
            and support safer relocation before disaster strikes.
          </p>

          <div className="hero-buttons">
            <a href="/signup" className="primary-btn">
              Get Started
            </a>

            <a href="#features" className="secondary-btn">
              Explore ResQ
            </a>
          </div>

          {/* Small capability indicators */}
          <div className="hero-highlights">
            <div>
              <strong>Risk</strong>
              <span>Identification</span>
            </div>

            <div>
              <strong>GIS</strong>
              <span>Hazard Mapping</span>
            </div>

            <div>
              <strong>Safe</strong>
              <span>Relocation Planning</span>
            </div>
          </div>

        </div>


        {/* Hero Visual */}
        <div className="hero-visual">

          <div className="map-card">

            <div className="map-header">
              <span>Hazard Intelligence Map</span>
              <span className="live">
                LIVE ANALYSIS
              </span>
            </div>

            <div className="map-area">

              {/* Red hazard zones */}
              <div className="risk-zone zone-one"></div>
              <div className="risk-zone zone-two"></div>

              {/* Vulnerable habitation */}
              <div className="habitation-point habitation-one">
                <span></span>
              </div>

              <div className="habitation-point habitation-two">
                <span></span>
              </div>

              {/* Safer relocation locations */}
              <div className="safe-point safe-one">
                <span>✓</span>
              </div>

              <div className="safe-point safe-two">
                <span>✓</span>
              </div>

              {/* Connecting relocation route */}
              <div className="relocation-route"></div>

            </div>

            <div className="map-footer">
              <span>🔴 Red Zone</span>
              <span>🟠 High Risk</span>
              <span>🟢 Safer Site</span>
            </div>

          </div>

        </div>

      </section>


      {/* Main Alert / Intelligence Banner */}
      <section className="alert-section">

        <div className="alert-icon">
          ⚠️
        </div>

        <div>
          <strong>
            Know the Risk Before Disaster Strikes
          </strong>

          <p>
            Identify vulnerable habitations, understand their risk,
            and support timely relocation decisions.
          </p>
        </div>

        <a href="#how-it-works" className="primary-btn">
          See How It Works
        </a>

      </section>


      {/* Features */}
      <section className="features" id="features">

        <div className="section-heading">

          <p>OUR INTELLIGENCE PLATFORM</p>

          <h2>
            From Risk Identification to
            <span> Safer Relocation</span>
          </h2>

          <p>
            ResQ combines hazard analysis, GIS intelligence,
            vulnerability assessment and relocation planning
            in one platform.
          </p>

        </div>


        <div className="feature-grid">

          {/* Feature 1 */}
          <div className="feature-card">
            <div>🗺️</div>

            <h3>
              Hazard & Red Zone Mapping
            </h3>

            <p>
              Identify hazardous areas and visualize red zones
              using an interactive GIS-based map.
            </p>
          </div>


          {/* Feature 2 */}
          <div className="feature-card">
            <div>🏘️</div>

            <h3>
              Vulnerable Habitations
            </h3>

            <p>
              Locate settlements exposed to hazards and assess
              population vulnerability and disaster exposure.
            </p>
          </div>


          {/* Feature 3 */}
          <div className="feature-card">
            <div>📊</div>

            <h3>
              Risk Assessment
            </h3>

            <p>
              Analyze hazard exposure, vulnerability and other
              risk factors to prioritize areas requiring attention.
            </p>
          </div>


          {/* Feature 4 */}
          <div className="feature-card">
            <div>📍</div>

            <h3>
              Relocation Planning
            </h3>

            <p>
              Identify safer alternative locations for populations
              living in high-risk and red-zone areas.
            </p>
          </div>


          {/* Feature 5 */}
          <div className="feature-card">
            <div>🏠</div>

            <h3>
              Carrying Capacity
            </h3>

            <p>
              Compare population requirements with the available
              capacity and infrastructure of potential relocation sites.
            </p>
          </div>


          {/* Feature 6 */}
          <div className="feature-card">
            <div>🚨</div>

            <h3>
              Emergency Response
            </h3>

            <p>
              Continue supporting SOS, emergency alerts,
              rescue coordination and essential disaster services.
            </p>
          </div>

        </div>

      </section>


      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">

    <div className="section-heading">
      <p className="section-label">OUR INTELLIGENCE PLATFORM</p>

      <h2>
        From Risk Identification to
        <span> Safer Relocation</span>
      </h2>

      <p className="section-description">
        Identify hazardous zones, assess vulnerable communities,
        and plan safer relocation with intelligent GIS insights.
      </p>
    </div>


        <div className="steps">

          {/* Step 1 */}
          <div className="step">
            <div className="step-number">
              01
            </div>

            <h3>
              Identify
            </h3>

            <p>
              Analyze hazards and identify areas that may
              become unsafe for habitation.
            </p>
          </div>


          {/* Step 2 */}
          <div className="step">
            <div className="step-number">
              02
            </div>

            <h3>
              Assess
            </h3>

            <p>
              Assess vulnerable habitations, population exposure
              and the severity of risk.
            </p>
          </div>


          {/* Step 3 */}
          <div className="step">
            <div className="step-number">
              03
            </div>

            <h3>
              Plan
            </h3>

            <p>
              Find suitable relocation sites and evaluate
              their available carrying capacity.
            </p>
          </div>


          {/* Step 4 */}
          <div className="step">
            <div className="step-number">
              04
            </div>

            <h3>
              Prioritize
            </h3>

            <p>
              Prioritize immediate, short-term and medium-term
              relocation needs for informed action.
            </p>
          </div>

        </div>

      </section>


      {/* PS 191 Highlight */}
      <section className="ps-highlight">

        <div className="ps-content">

          <p className="hero-label">
            PROACTIVE DISASTER MANAGEMENT
          </p>

          <h2>
            Don't Wait for Disaster.
            <span> Prepare Before It Happens.</span>
          </h2>

          <p>
            ResQ transforms disaster-related data into actionable
            intelligence — helping authorities identify unsafe
            habitations, evaluate safer alternatives and make
            informed relocation decisions.
          </p>

          <a href="/signup" className="primary-btn">
            Start with ResQ
          </a>

        </div>

      </section>


      {/* Existing Emergency CTA */}
      <section className="cta">

        <h2>
          Be Ready. Stay Connected.
        </h2>

        <p>
          From proactive risk assessment to emergency response,
          ResQ helps communities stay safer and better prepared.
        </p>

        <a href="/signup">
          Create Your Account
        </a>

      </section>


      {/* Footer */}
      <footer className="footer">

        <div>
          <h2>ResQ</h2>

          <p>
            Identify Risk. Protect Lives.
          </p>
        </div>

        <div>
          <p>Risk Intelligence</p>
          <p>Relocation Planning</p>
          <p>Emergency Response</p>
        </div>

        <div>
          <p>© 2026 ResQ</p>
        </div>

      </footer>

    </div>
  );
}

export default Home;
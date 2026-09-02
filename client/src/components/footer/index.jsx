import "./styles.scss";

const IconCCLogo = (props) => (
  <svg viewBox="0 0 48.096 64.521" fill="currentColor" {...props}>
    <path
      transform="translate(1.074 0.004)"
      fillRule="evenodd"
      d="M 17.657 52.456 L 0 64.517 L 0 51.356 L 8.118 45.905 L 17.657 52.456 Z M 17.52 39.591 L 17.853 39.591 L 27.187 45.947 L 47.022 32.4 L 37.732 25.989 L 17.863 39.589 L 17.523 39.589 L 17.52 39.591 Z M 18.695 26.019 L 0.052 13.15 L 0.069 0 L 28.261 19.454 L 18.695 26.019 Z"
    />
    <path transform="translate(0 32.225)" d="M 47.022 32.291 L 0 0 L 18.929 0 L 47.022 19.13 L 47.022 32.291 Z" />
    <path transform="translate(0 0.001)" d="M 46.97 13.039 L 18.94 32.226 L 0 32.226 L 46.952 0 L 46.97 13.039 Z" />
  </svg>
);

const IconGithub = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const IconInstagram = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const IconLinkedIn = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const Footer = () => {
    return (
        <footer className="footer-container">
            <div className="left">
                <p className="footer-text">Designed, Developed and Maintained by Coding Club IITG</p>
                <div className="link-logo-container">
                    <div className="lockup">
                        <IconCCLogo width={35} height={45} aria-hidden="true" style={{ color: "white" }} />
                        <span>Coding Club</span>
                    </div>
                    <div className="link-group">
                        <a href="https://github.com/Coding-Club-IITG" target="_blank" rel="noopener noreferrer" className="link-img">
                            <IconGithub width={24} height={24} />
                        </a>
                        <a href="https://linkedin.com/company/coding-club-iitg" target="_blank" rel="noopener noreferrer" className="link-img">
                            <IconLinkedIn width={24} height={24} />
                        </a>
                        <a href="https://instagram.com/codingclubiitg" target="_blank" rel="noopener noreferrer" className="link-img">
                            <IconInstagram width={24} height={24} />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

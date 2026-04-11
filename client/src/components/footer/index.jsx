import "./styles.scss";
const Footer = () => {
    return (
        <footer className="footer-container">
            <div className="left">
                <p className="footer-text">Designed, Developed and Maintained by</p>
                <div className="link-logo-container">
                    <div className="footer-img"></div>
                    <div className="link-group">
                        <a
                            href="https://linktr.ee/codingclubiitg"
                            target="_blank"
                            className="link-img website"
                        ></a>
                        <a
                            href="https://www.linkedin.com/company/coding-club-iitg"
                            target="_blank"
                            className="link-img linkedin"
                        ></a>
                        <a
                            href="https://www.instagram.com/codingclubiitg/"
                            target="_blank"
                            className="link-img instagram"
                        ></a>
                        <a
                            href="https://twitter.com/codingclubiitg"
                            target="_blank"
                            className="link-img twitter"
                        ></a>
                    </div>
                </div>
            </div>
            
        </footer>
    );
};

export default Footer;

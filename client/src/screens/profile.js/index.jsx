import FrontBanner from "./components/FrontBanner";
import ContributionsSection from "./components/Contri_section";
import NavBar from "../../components/navbar";
import Footer from "../../components/footer";
import styles from "./styles.module.scss";
export default function ProfilePage() {
    return (
        <div className={styles.page}>
            <NavBar />
            <main>
                <FrontBanner />
                <ContributionsSection />
            </main>
            <Footer />
        </div>
    );
}

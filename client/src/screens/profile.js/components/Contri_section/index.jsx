import { useNavigate } from "react-router-dom";
import { useQuery } from "@coursehub/browser";
import { Button, ErrorState, LoadingState } from "@coursehub/ui";
import { useSession } from "../../../../session/context";
import { library } from "../../../../session/runtime";
import Container from "../../../../components/container";
import ContributionCard from "./ContributionCard";
import { GetMyContributions, GetBrContribution } from "../../../../api/Contribution";
import styles from "./styles.module.scss";
export default function ContributionsSection() {
    const isBR = useSession().data?.isBR === true,
        navigate = useNavigate();
    const query = useQuery({
        queryKey: library.key("contributions", isBR ? "moderation" : "own"),
        queryFn: ({ signal }) => (isBR ? GetBrContribution(signal) : GetMyContributions(signal)),
        retry: false,
    });
    const submissions = isBR ? query.data?.unverifiedContributions || [] : query.data || [];
    const files = submissions.flatMap((submission) =>
        submission.files
            .filter((file) => !isBR || !file.isVerified)
            .map((file) => ({ submission, file })),
    );
    return (
        <Container color="light" className={styles.section}>
            <section className={styles.content} aria-labelledby="contributions-heading">
                <h2 id="contributions-heading">
                    {isBR
                        ? query.isSuccess && !files.length
                            ? "NO PENDING CONTRIBUTIONS"
                            : "PENDING CONTRIBUTIONS"
                        : "YOUR CONTRIBUTIONS"}
                </h2>
                {query.isPending ? (
                    <LoadingState
                        className={styles.state}
                        title={`Loading ${isBR ? "pending" : "your"} contributions…`}
                    />
                ) : query.isError ? (
                    <ErrorState
                        className={styles.state}
                        title="Could not load contributions"
                        error={query.error}
                        onRetry={() => query.refetch()}
                        retrying={query.isFetching}
                    />
                ) : files.length ? (
                    <div className={styles.list}>
                        {files.map(({ submission, file }) => (
                            <ContributionCard
                                key={file._id}
                                courseCode={submission.courseCode}
                                managementCourseCode={submission.managementCourseCode}
                                uploadDate={submission.updatedAt}
                                file={file}
                                onChanged={() => query.refetch()}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.empty}>
                        <p>
                            {isBR
                                ? "When someone contributes a file, it will appear here for verification."
                                : "Files you contribute will appear here, including those awaiting approval."}
                        </p>
                        <div
                            className={isBR ? styles.brArtwork : styles.artwork}
                            aria-hidden="true"
                        />
                    </div>
                )}
                <div className={styles.refresh}>
                    <Button variant="dark" onClick={() => navigate("/loading?returnTo=%2Fprofile")}>
                        Refresh registered courses
                    </Button>
                </div>
            </section>
        </Container>
    );
}

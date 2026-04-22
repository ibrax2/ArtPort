import styles from "./ProfilePostsGrid.module.css";
import Link from "next/link";

export type ProfilePostItem = {
  id: string;
  imageSrc: string;
  title: string;
};

export type ProfilePostsGridProps = {
  posts: ProfilePostItem[];
  username: string;
};

export default function ProfilePostsGrid({
  posts,
  username,
}: ProfilePostsGridProps) {
  return (
    <section
      className={styles.section}
      aria-label={`Posts by ${username}`}
    >
      {posts.length === 0 ? (
        <p className={styles.empty}>No uploads yet.</p>
      ) : (
        <ul className={styles.grid}>
          {posts.map((p) => (
            <li key={p.id} className={styles.card}>
              <Link href={`/post/${encodeURIComponent(p.id)}`}>
                <div className={styles.thumbWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- API URLs / mixed sources */}
                  <img
                    src={p.imageSrc}
                    alt=""
                    className={styles.thumb}
                  />
                </div>
                <p className={styles.title}>{p.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

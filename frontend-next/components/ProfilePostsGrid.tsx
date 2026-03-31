import styles from "./ProfilePostsGrid.module.css";

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
      <h2 className={styles.heading}>Your posts</h2>
      {posts.length === 0 ? (
        <p className={styles.empty}>No uploads yet.</p>
      ) : (
        <ul className={styles.grid}>
          {posts.map((p) => (
            <li key={p.id} className={styles.card}>
              <div className={styles.thumbWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element -- API URLs / mixed sources */}
                <img
                  src={p.imageSrc}
                  alt=""
                  className={styles.thumb}
                />
              </div>
              <p className={styles.title}>{p.title}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

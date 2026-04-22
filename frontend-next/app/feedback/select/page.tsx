import { Suspense } from "react";

import styles from "../feedback.module.css";
import SelectArtworkParam from "./SelectArtworkParam";

export default function FeedbackSelectPage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<p>Loading…</p>}>
        <SelectArtworkParam />
      </Suspense>
    </main>
  );
}

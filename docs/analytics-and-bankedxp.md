Of course. Here is a complete, detailed Markdown file explaining how the analytics API and its underlying data pipelines work, the root cause of the data redundancy issue in your scenario, and the correct way to implement the data flow.

***

# Timeback Analytics API: Architecture and Data Integrity Guide

## 1. Executive Summary

This document provides a comprehensive overview of the Timeback Analytics API architecture, detailing how it processes data from both real-time Caliper events and periodic ETL (Extract, Transform, Load) runs from the main OneRoster database.

The system is robustly designed with two independent data pipelines that feed into a centralized analytics database. However, a specific data reporting pattern has been identified that leads to the double-counting of "banked XP," causing inflated metrics in the UI.

-   **The Problem:** When an exercise is completed, the Caliper event is being sent with the *total XP*, including XP banked from previously completed activities (videos, articles). Later, a separate ETL process reads the updated `assessment_results` for those previous activities and creates *another* set of analytics facts for the same XP, leading to double-counting.
-   **The Root Cause:** The issue stems from the Caliper event for the exercise violating the principle of atomicity. It reports on value changes (banked XP) that did not occur as a direct result of the event itself.
-   **The Solution:** The Caliper event for the exercise must be modified to **only include the XP earned directly from that exercise**. The existing `awardBankedXpForExercise` logic and the scheduled OneRoster ETL pipeline are already correctly designed to handle the backfilling of banked XP, and this process should be trusted to ensure eventual consistency.

By adhering to this principle, we can ensure the accuracy and integrity of the data presented in the learning metrics dashboards.

## 2. System Architecture Overview

The analytics system is composed of two distinct but interconnected repositories: the **Main Application** (UI and transactional APIs) and the **Analytics Repository** (ETL and reporting API).

### Key Components

1.  **Main Application (OneRoster/PowerPath API):**
    *   Manages the user interface (`_app/app/learning-metrics.tsx`).
    *   Handles transactional data like courses, enrollments, and `assessment_results`.
    *   Receives real-time learning data via a Caliper webhook (`routes/internal/caliper/index.ts`).
    *   Queues incoming events into Redis for asynchronous processing.

2.  **Analytics Repository:**
    *   Contains the business logic for processing and aggregating data.
    *   Runs background **workers** (`workers/workers/*.worker.ts`) that listen to the Redis queue.
    *   Executes **ETL pipelines** (`pipelines/**/*.ts`) to transform raw data into a structured format.
    *   Stores this structured data in a dedicated **analytics database** (`processed_facts` table).
    *   Exposes a read-only **Reporting API** (`api/routes/reports.ts`) for dashboards.

### The Two Data Pipelines

Data flows into the analytics database through two independent pipelines:



1.  **Real-Time Caliper Pipeline:**
    *   **Trigger:** An action in a learning application (e.g., completing an exercise).
    *   **Path:** External App → Caliper Webhook → Redis Queue → `caliperFactsWorker` → `caliperFactsPipeline` → `processed_facts` table.
    *   **Purpose:** To capture granular, event-based data as it happens.

2.  **Scheduled OneRoster ETL Pipeline:**
    *   **Trigger:** A cron job schedule (e.g., daily).
    *   **Path:** `onerosterFactsWorker` → `oneRosterFactsPipeline` → Queries main app's `assessment_results` → `processed_facts` table.
    *   **Purpose:** To ensure the analytics database is eventually consistent with the main application's state, capturing any data that was updated after the initial event (like backfilled XP).

## 3. The Problem: Double-Counting Banked XP

The current implementation leads to incorrect XP totals when "banked XP" is awarded. Let's trace the user's scenario through the system.

### The Scenario

1.  **Video (5 XP):** User watches a 5-minute video. A `TimeSpentEvent` is sent. The `assessment_result` is created/updated, but `metadata.xp` is `0`.
2.  **Article (1 XP):** User reads an article for 1 minute. A `TimeSpentEvent` is sent. The `assessment_result` is updated, but `metadata.xp` is `0`.
3.  **Exercise (2 XP + 25% bonus):** User completes an exercise with 100% accuracy, earning **3 XP** directly.
4.  **Banked XP Awarded:** The `awardBankedXpForExercise` function is triggered. It calculates the banked XP from the video (5) and article (1), and updates their respective `assessment_results` records in the main database to reflect this.
5.  **Aggregated Caliper Event:** A single Caliper `ActivityEvent` is sent for the exercise, but its payload incorrectly includes the total XP: `3 (exercise) + 5 (video) + 1 (article) = 9 XP`.

### How the Data is Processed (The Incorrect Way)

This sequence of events causes the two pipelines to process the same XP values independently.

**1. The Caliper Pipeline (Immediate Processing)**

*   The `caliperFactsWorker` receives the `ActivityEvent` for the exercise.
*   The `activityEventFactsGenerator` (`pipelines/caliper/facts/generators.ts`) parses the event. It sees a single metric: `xpEarned: 9`.
*   It creates **one** row in the `processed_facts` table:
    ```sql
    -- Fact generated by the Caliper pipeline
    INSERT INTO processed_facts (email, date, ..., xpEarned, sources) VALUES
    ('student@email.com', '2025-08-15', ..., 9.00, ARRAY['caliper:event:<exercise_event_id>']);
    ```
*   **Analytics DB State:** Total XP for the student is now **9**.

**2. The OneRoster ETL Pipeline (Scheduled Processing)**

*   At a later time (e.g., at midnight), the `onerosterFactsWorker` runs.
*   The `oneRosterFactsPipeline` (`pipelines/oneroster/facts/pipeline.ts`) queries the main application's `assessment_results` table for recent changes.
*   It finds the **updated** records for the video and the article, which now have their banked XP values populated by `awardBankedXpForExercise`.
*   The `generateOnerosterFacts` function (`pipelines/oneroster/facts/generators.ts`) processes these records:
    *   For the video result, it sees `ar_xp: 5`.
    *   For the article result, it sees `ar_xp: 1`.
*   It creates **two new rows** in the `processed_facts` table:
    ```sql
    -- Facts generated by the OneRoster ETL pipeline
    INSERT INTO processed_facts (email, date, ..., xpEarned, sources) VALUES
    ('student@email.com', '2025-08-15', ..., 5.00, ARRAY['oneroster:assessment_result:<video_result_id>']),
    ('student@email.com', '2025-08-15', ..., 1.00, ARRAY['oneroster:assessment_result:<article_result_id>']);
    ```

**3. The Final Result in the UI**

When the `/app/learning-metrics` UI fetches data, the analytics API's `aggregateFacts` function queries the `processed_facts` table and finds three separate records for this student on this day:

*   One with `xpEarned: 9` (from the exercise Caliper event)
*   One with `xpEarned: 5` (from the video's backfilled result)
*   One with `xpEarned: 1` (from the article's backfilled result)

The UI correctly sums these values, resulting in an **incorrect total of 15 XP**.

## 4. Root Cause Analysis

The root cause is **not a bug in the analytics repository's logic**. The analytics repository is correctly processing the data it receives from both pipelines.

The problem lies in the **data sent by the main application**. The Caliper event for the exercise is violating a fundamental principle of event-driven architecture:

> **Events should be atomic and represent a single, self-contained fact about something that just happened.**

The exercise completion event should only describe the outcome of the exercise itself. By bundling the banked XP from *other activities* into this single event, it creates an inaccurate and misleading record of what occurred at that moment. This breaks the assumption of independence between the Caliper and OneRoster ETL pipelines, leading to the double-counting.

## 5. The Correct Implementation

The solution is to enforce the principle of atomic events and allow each pipeline to do its job correctly.

### The Guiding Principle
Each system should report only the data it is directly responsible for.
*   **The Caliper Event:** Reports the immediate outcome of the exercise.
*   **The `assessment_results` Table:** Acts as the source of truth for the final, potentially updated state of all activities.

### Step 1: Modify the Caliper Event Generation

The logic in the main application that sends the Caliper event upon exercise completion must be changed. It should **only include the XP earned directly from that exercise**.

**Incorrect Event Payload:**
```json
"items": [{ "type": "xpEarned", "value": 9 }] // Bundled XP
```

**Correct Event Payload:**
```json
"items": [{ "type": "xpEarned", "value": 3 }] // XP from the exercise only
```

### Step 2: Trust the Existing Logic

**No changes are needed** in the `awardBankedXpForExercise` function or the OneRoster ETL pipeline. This part of the system is already working as intended:

*   The `awardBankedXpForExercise` function correctly updates the main application's database, ensuring the transactional data is accurate.
*   The `onerosterFactsWorker` correctly performs its job of ensuring the analytics database is eventually consistent with the main database's state.

### Tracing the Correct Data Flow

With the corrected Caliper event, the data flow becomes accurate:

1.  **Video & Article Completion:** `assessment_results` are created with `xp: 0`. Two `TimeSpentEvent`s are sent.
2.  **Exercise Completion:**
    *   The Caliper `ActivityEvent` is sent with **3 XP**. The Caliper pipeline creates a fact: `(xpEarned: 3, source: caliper:event:<exercise_id>)`.
    *   The `awardBankedXpForExercise` function updates the video and article `assessment_results` to `xp: 5` and `xp: 1` respectively.
3.  **Scheduled ETL Run:**
    *   The `onerosterFactsWorker` runs.
    *   It finds the updated video result and creates a fact: `(xpEarned: 5, source: oneroster:result:<video_id>)`.
    *   It finds the updated article result and creates a fact: `(xpEarned: 1, source: oneroster:result:<article_id>)`.
4.  **Final UI Query:** The analytics API queries the `processed_facts` table and finds three distinct, accurate records. The UI correctly sums them: `3 + 5 + 1 = 9 XP`.

By making this single change at the source of the Caliper event, we restore data integrity across the entire system, leveraging the strength of the dual-pipeline architecture without introducing redundant data.
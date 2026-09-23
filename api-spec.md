# EDUVIA Platform - REST API Specification & Endpoint Roadmap

This document outlines the complete REST API specification derived from the EDUVIA frontend interfaces (`eduvia_landing_page`, `student_dashboard`, `24_7_ai_tutor_workspace`, and `student_doubt_community`).

---

## Table of Contents
1. [Auth (Authentication & User Profile)](#1-auth-authentication--user-profile)
2. [Quiz, Dashboard & Community](#2-quiz-dashboard--community)
   - [Dashboard & Streaks](#dashboard--streaks)
   - [Courses & Learning Progress](#courses--learning-progress)
   - [Leaderboards & Gamification](#leaderboards--gamification)
   - [Quizzes & Socratic Checkpoints](#quizzes--socratic-checkpoints)
   - [Student Doubts & Peer Community](#student-doubts--peer-community)
3. [Feynman Voice Evaluator & 24/7 AI Tutor](#3-feynman-voice-evaluator--247-ai-tutor)
   - [Feynman Voice & Audio Evaluation](#feynman-voice--audio-evaluation)
   - [24/7 AI Tutor Workspace & Multimodal Inference](#247-ai-tutor-workspace--multimodal-inference)
   - [Study Notes & Flashcards](#study-notes--flashcards)

---

## 1. Auth (Authentication & User Profile)

### `POST /api/v1/auth/register`
* **Description**: Register a new student account.
* **Request Body**:
  ```json
  {
    "full_name": "Alex Mercer",
    "email": "alex@university.edu",
    "password": "SecurePassword123!",
    "university": "Stanford University",
    "major": "Computer Science"
  }
  ```
* **Response `(201 Created)`**:
  ```json
  {
    "user_id": "usr_99812",
    "token": "jwt_token_string",
    "message": "Account created successfully"
  }
  ```

### `POST /api/v1/auth/login`
* **Description**: Authenticate student credentials.
* **Request Body**:
  ```json
  {
    "email": "alex@university.edu",
    "password": "SecurePassword123!"
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "user_id": "usr_99812",
    "token": "jwt_token_string",
    "expires_in": 86400
  }
  ```

### `POST /api/v1/auth/logout`
* **Description**: Invalidate active session / token.
* **Response `(200 OK)`**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### `GET /api/v1/auth/me`
* **Description**: Retrieve active authenticated user profile telemetry displayed in header and dashboard banners.
* **Response `(200 OK)`**:
  ```json
  {
    "id": "usr_99812",
    "name": "Alex M.",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "level": 4,
    "tier_title": "Level 4 • Problem Solver",
    "global_rank": 482,
    "global_percentile": "Top 1.2%",
    "division": "Diamond Div II",
    "streak_days": 12,
    "xp_balance": 2840,
    "xp_multiplier": 1.4,
    "streak_protected_hours": 6,
    "longest_streak_days": 27,
    "freezes_available": 2,
    "university": "Stanford University"
  }
  ```

### `PATCH /api/v1/user/profile`
* **Description**: Update user profile, avatars, or academic details.
* **Request Body**:
  ```json
  {
    "avatar_url": "https://...",
    "strong_subjects": ["Data Structures", "Python", "Calculus"],
    "bio": "Systems and algorithms enthusiast"
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "success": true,
    "user": { ... }
  }
  ```

### `GET /api/v1/user/settings`
* **Description**: Retrieve student preferences (e.g. default cognitive tutor mode, voice speed, push notifications).
* **Response `(200 OK)`**:
  ```json
  {
    "default_cognitive_mode": "socratic_mentor",
    "auto_ai_check": true,
    "voice_model": "neural_expressive_v2",
    "notifications_enabled": true
  }
  ```

---

## 2. Quiz, Dashboard & Community

### Dashboard & Streaks

#### `GET /api/v1/dashboard/summary`
* **Description**: Fetch all metrics for the dashboard command center.
* **Response `(200 OK)`**:
  ```json
  {
    "streak": {
      "current_days": 12,
      "is_hot": true,
      "longest_days": 27,
      "today_xp": 120,
      "freezes_available": 2,
      "xp_multiplier": "1.4x",
      "today_target": {
        "completed": 3,
        "total": 5,
        "percentage": 60
      },
      "weekly_calendar": [
        {"day": "M", "completed": true},
        {"day": "T", "completed": true},
        {"day": "W", "completed": true},
        {"day": "T", "completed": true},
        {"day": "F", "completed": true},
        {"day": "S", "is_today": true, "completed": false},
        {"day": "S", "scheduled": true}
      ]
    }
  }
  ```

#### `POST /api/v1/dashboard/streak/continue`
* **Description**: Trigger streak continuation micro-task action (+40 XP).
* **Response `(200 OK)`**:
  ```json
  {
    "xp_earned": 40,
    "new_streak_days": 12,
    "new_total_xp": 2880,
    "message": "Streak maintained! +40 XP awarded"
  }
  ```

#### `GET /api/v1/dashboard/daily-quest`
* **Description**: Retrieve current active daily challenge quest and countdown timer.
* **Response `(200 OK)`**:
  ```json
  {
    "quest_id": "qst_daily_902",
    "title": "Systems & Doubts Accelerator",
    "description": "Solve 3 programming questions or review 1 student doubt in Systems.",
    "seconds_remaining": 30251,
    "current_step": 1,
    "total_steps": 3,
    "rewards": {
      "xp": 100,
      "streak_freeze": 1,
      "badge": "Quest Master Tier 1"
    }
  }
  ```

#### `POST /api/v1/dashboard/daily-quest/claim`
* **Description**: Claim rewards once daily quest requirements are completed.
* **Response `(200 OK)`**:
  ```json
  {
    "success": true,
    "xp_awarded": 100,
    "freezes_awarded": 1,
    "badge_unlocked": "Quest Master Tier 1"
  }
  ```

---

### Courses & Learning Progress

#### `GET /api/v1/courses/enrolled`
* **Description**: Get all courses enrolled by the student with progress tracking.
* **Response `(200 OK)`**:
  ```json
  {
    "courses": [
      {
        "id": "crs_py_sys",
        "category": "Computer Science",
        "title": "Python & System Design",
        "next_lesson": "Asyncio & Concurrency Engine",
        "lessons_completed": 18,
        "lessons_total": 26,
        "progress_percentage": 68,
        "time_remaining": "45m left",
        "instructor": {
          "name": "Dr. Thorne",
          "avatar_url": "https://..."
        },
        "thumbnail_url": "https://..."
      },
      {
        "id": "crs_dsa",
        "category": "Algorithms",
        "title": "Data Structures & Alg",
        "next_lesson": "Binary Search Trees & Rebalance",
        "lessons_completed": 12,
        "lessons_total": 28,
        "progress_percentage": 42,
        "time_remaining": "1h 10m left",
        "instructor": {
          "name": "Prof. Mehta",
          "avatar_url": "https://..."
        },
        "thumbnail_url": "https://..."
      }
    ]
  }
  ```

#### `POST /api/v1/courses/{courseId}/lessons/{lessonId}/progress`
* **Description**: Update lesson completion and update progression milestones.
* **Request Body**:
  ```json
  {
    "status": "completed",
    "time_spent_seconds": 1240
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "course_progress_percentage": 72,
    "xp_earned": 25
  }
  ```

---

### Leaderboards & Gamification

#### `GET /api/v1/leaderboards/league`
* **Description**: Retrieve active division standings (Diamond League, Master League promo cutoff).
* **Response `(200 OK)`**:
  ```json
  {
    "league_name": "Diamond League",
    "tier": "Tier 1",
    "time_remaining": "2d 14h left",
    "promotion_cutoff_rank": 3,
    "target_xp_for_promotion": 70,
    "standings": [
      {"rank": 1, "name": "Jordan V.", "xp": 3120, "trend": "up", "avatar": "https://..."},
      {"rank": 2, "name": "Tanya R.", "xp": 2990, "trend": "up", "avatar": "https://..."},
      {"rank": 3, "name": "Leo Zhao", "xp": 2910, "trend": "up", "avatar": "https://..."},
      {"rank": 4, "name": "Alex (You)", "xp": 2840, "trend": "steady", "is_current_user": true, "avatar": "https://..."},
      {"rank": 5, "name": "Karim N.", "xp": 2760, "trend": "down", "avatar": "https://..."}
    ]
  }
  ```

#### `GET /api/v1/leaderboards/top-solvers`
* **Description**: Retrieve weekly top community solvers and mentors.
* **Response `(200 OK)`**:
  ```json
  {
    "top_solvers": [
      {
        "rank": 1,
        "name": "Sarah K.",
        "institution": "IIT Bombay",
        "specialization": "Algorithms Guru",
        "weekly_xp": 1420,
        "rank_delta": "+3 ranks",
        "avatar": "https://..."
      },
      {
        "rank": 2,
        "name": "Alex M.",
        "institution": "Stanford University",
        "specialization": "L4 Systems Mentor",
        "weekly_xp": 1280,
        "rank_delta": "+1 rank",
        "is_current_user": true,
        "avatar": "https://..."
      }
    ]
  }
  ```

---

### Quizzes & Socratic Checkpoints

#### `POST /api/v1/quizzes/generate`
* **Description**: Dynamically generate an in-thread knowledge check checkpoint for learning verification.
* **Request Body**:
  ```json
  {
    "topic": "Linked Lists vs Arrays CPU Cache Locality",
    "difficulty": "intermediate",
    "context_message_id": "msg_88192"
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "quiz_id": "qiz_5510",
    "question": "If your algorithm requires frequent constant-time O(1) random access by index number, which data structure wins and why?",
    "options": [
      {
        "id": "opt_a",
        "text": "Option A: Linked List, because pointer traversal is dynamic"
      },
      {
        "id": "opt_b",
        "text": "Option B: Array, because memory address calculation is base + (index × size)"
      },
      {
        "id": "opt_c",
        "text": "Option C: Both are mathematically identical in random access"
      }
    ]
  }
  ```

#### `POST /api/v1/quizzes/{quizId}/evaluate`
* **Description**: Evaluate chosen answer option for immediate feedback and XP reward.
* **Request Body**:
  ```json
  {
    "selected_option_id": "opt_b"
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "is_correct": true,
    "correct_option_id": "opt_b",
    "feedback_text": "Spot on! Arrays allow instantaneous direct pointer arithmetic indexing without walking pointers.",
    "xp_awarded": 10
  }
  ```

---

### Student Doubts & Peer Community

#### `GET /api/v1/doubts`
* **Description**: Search and list doubts across categories (`Trending`, `Unanswered`, `Verified Mentors`, `My Subjects`).
* **Query Parameters**: `?subject=DataStructures&tab=trending&search=quicksort&sort=most_active`
* **Response `(200 OK)`**:
  ```json
  {
    "total_count": 1200,
    "doubts": [
      {
        "id": "dbt_1001",
        "author": {
          "name": "Kavita Rao",
          "avatar": "https://...",
          "level": "Level 3 Learner",
          "university": "Stanford University CS106B"
        },
        "title": "How does a linked list actually store nodes in memory and why do we get segmentation faults when dereferencing next?",
        "snippet_preview": "while(head->next != NULL) { head = head->next; }",
        "tags": ["#DataStructures", "#LinkedLists", "#MemoryPointers", "#CPP"],
        "bounty_xp": 100,
        "upvotes": 24,
        "answers_count": 3,
        "views": 412,
        "created_at": "2026-09-23T18:30:00Z"
      }
    ]
  }
  ```

#### `POST /api/v1/doubts`
* **Description**: Publish a new doubt with an attached XP bounty.
* **Request Body**:
  ```json
  {
    "title": "Deadlock condition in mutex locks when dining philosophers problem implemented in C++20",
    "subject_domain": "Data Structures & Algorithms",
    "bounty_xp": 100,
    "body_markdown": "Paste snippet, stack trace, and what you've tried...",
    "code_language": "cpp",
    "code_snippet": "std::unique_lock<std::mutex> lock(m);",
    "attachments": ["https://..."]
  }
  ```
* **Response `(201 Created)`**:
  ```json
  {
    "doubt_id": "dbt_1099",
    "bounty_deducted": 100,
    "new_user_xp_balance": 2740,
    "status": "published"
  }
  ```

#### `GET /api/v1/doubts/{doubtId}`
* **Description**: Fetch full doubt thread with solutions, accepted answer, and comments.
* **Response `(200 OK)`**:
  ```json
  {
    "doubt": {
      "id": "dbt_1001",
      "title": "How does a linked list actually store nodes in memory...",
      "body": "I am writing C++ code for singly linked list traversal...",
      "code_snippet": "struct Node { int data; Node* next; };",
      "error_type": "Segmentation Fault (SIGSEGV)",
      "bounty_xp": 100,
      "upvotes": 24,
      "solutions": [
        {
          "id": "ans_501",
          "is_accepted": true,
          "verified_by": "Prof. Sharma",
          "author": {
            "name": "Alex M.",
            "avatar": "https://...",
            "tier": "Level 4 Mentor",
            "xp": 2840
          },
          "content_markdown": "Your while loop condition causes two fatal issues...",
          "corrected_code": "void safeTraverse(Node* head) { while (head != nullptr) { ... } }",
          "upvotes": 42,
          "replies_count": 4
        }
      ]
    }
  }
  ```

#### `POST /api/v1/doubts/{doubtId}/upvote`
* **Description**: Toggle upvote for a doubt question.
* **Response `(200 OK)`**:
  ```json
  {
    "doubt_id": "dbt_1001",
    "upvoted": true,
    "new_upvote_count": 25
  }
  ```

#### `POST /api/v1/doubts/{doubtId}/answers`
* **Description**: Submit a solution for an active student doubt.
* **Request Body**:
  ```json
  {
    "content_markdown": "Always check the pointer itself for nullity...",
    "code_snippet": "while(head != nullptr) { ... }",
    "run_ai_precheck": true
  }
  ```
* **Response `(201 Created)`**:
  ```json
  {
    "answer_id": "ans_602",
    "xp_credited": 50,
    "message": "Answer published! +50 XP credited."
  }
  ```

#### `POST /api/v1/doubts/answers/{answerId}/accept`
* **Description**: Mark an answer as accepted and disburse the bounty to the author.
* **Response `(200 OK)`**:
  ```json
  {
    "answer_id": "ans_602",
    "is_accepted": true,
    "bounty_awarded_xp": 100
  }
  ```

#### `POST /api/v1/doubts/ai-check`
* **Description**: Pre-analyze answer draft for syntax/compilation bugs and pedagogical clarity.
* **Request Body**:
  ```json
  {
    "code_snippet": "void traverse(Node* head) { while(head->next != NULL) ... }",
    "language": "cpp",
    "explanation": "Here is how to traverse without crashes"
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "has_compilation_errors": false,
    "pedagogical_clarity_score": 94,
    "detected_edge_cases": ["Empty list head == nullptr dereference"],
    "suggestions": ["Include boundary check for head == nullptr"]
  }
  ```

---

## 3. Feynman Voice Evaluator & 24/7 AI Tutor

### Feynman Voice & Audio Evaluation

#### `POST /api/v1/feynman/evaluate-voice`
* **Description**: Upload spoken voice explanation or transcript. The Feynman evaluation engine breaks down conceptual mastery, spots jargon, gauges clarity, and flags cognitive gaps.
* **Request (Multipart Form Data / JSON)**:
  ```json
  {
    "topic": "CPU Cache Locality & Linked List Heap Fragmentation",
    "audio_file_url": "https://storage.eduvia.ai/audio/alex_explanation_feynman.wav",
    "transcript": "So when we access an array, the CPU grabs a whole 64-byte chunk at once into L1 cache, meaning sequential items are already right there in fast memory..."
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "feynman_score": 92,
    "grade": "Mastery",
    "metrics": {
      "simplicity": 95,
      "intuition": 90,
      "jargon_handling": "Minimal & properly grounded",
      "analogies_used": ["64-byte Cache Line grab", "L1 cache fast lane vs DRAM wait"]
    },
    "identified_gaps": [
      "Could briefly mention dirty cache line write-back behavior"
    ],
    "ai_mentor_feedback": "Exceptional intuitive explanation. You clearly understand spatial locality versus pointer hopping.",
    "xp_awarded": 50
  }
  ```

#### `POST /api/v1/audio/transcribe`
* **Description**: Convert speech from the microphone button into text for rapid prompt submission.
* **Request Body**: Binary audio payload or audio URL.
* **Response `(200 OK)`**:
  ```json
  {
    "transcription": "How does a linked list actually store nodes in memory compared to an array?",
    "confidence": 0.98
  }
  ```

#### `POST /api/v1/audio/synthesize`
* **Description**: Convert AI explanation response into natural expressive voice for the "Listen" button.
* **Request Body**:
  ```json
  {
    "text": "Arrays guarantee that item i+1 is parked directly next to i in RAM...",
    "voice_id": "neural_expressive_v2",
    "speed": 1.0
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "audio_stream_url": "https://storage.eduvia.ai/voice/synth_9812.mp3",
    "duration_seconds": 14.8
  }
  ```

---

### 24/7 AI Tutor Workspace & Multimodal Inference

#### `GET /api/v1/ai-tutor/sessions`
* **Description**: Retrieve list of active and past doubt sessions for the sidebar filter.
* **Response `(200 OK)`**:
  ```json
  {
    "sessions": [
      {
        "id": "sess_891",
        "subject": "Data Structures",
        "title": "Memory leak in linked list deletion",
        "last_message": "Alex: How does a linked list actually store nodes...",
        "updated_at": "10m ago",
        "active": true
      },
      {
        "id": "sess_890",
        "subject": "Algorithms",
        "title": "Understanding Dijkstra vs A* Search",
        "last_message": "Eduvia AI: Heuristic distance bounds ensure optimality...",
        "updated_at": "Yesterday",
        "active": false
      }
    ]
  }
  ```

#### `POST /api/v1/ai-tutor/sessions`
* **Description**: Initialize a new doubt conversation thread.
* **Request Body**:
  ```json
  {
    "subject": "Data Structures",
    "cognitive_mode": "socratic_mentor"
  }
  ```
* **Response `(201 Created)`**:
  ```json
  {
    "session_id": "sess_892",
    "created_at": "2026-09-23T20:40:00Z"
  }
  ```

#### `GET /api/v1/ai-tutor/sessions/{sessionId}/messages`
* **Description**: Get full message history of an AI tutor session.
* **Response `(200 OK)`**:
  ```json
  {
    "session_id": "sess_891",
    "messages": [
      {
        "id": "msg_001",
        "sender": "student",
        "content": "How does a linked list actually store nodes in memory compared to an array?",
        "attachments": [
          {
            "name": "heap_fragmentation_sketch.png",
            "url": "https://...",
            "type": "image"
          }
        ],
        "timestamp": "2:42 PM"
      },
      {
        "id": "msg_002",
        "sender": "ai_tutor",
        "cognitive_mode": "socratic_mentor",
        "content_blocks": [
          {
            "type": "concept_header",
            "title": "Deep Concept Analysis"
          },
          {
            "type": "step",
            "step_number": 1,
            "title": "Memory Layout: Physical Alignment",
            "body": "Arrays guarantee that item i+1 is parked directly next to i in RAM..."
          },
          {
            "type": "hardware_telemetry",
            "title": "L1/L2 Cache Prefetch Engine",
            "body": "When the CPU reads arr[0], the memory controller grabs an entire 64-byte Cache Line..."
          },
          {
            "type": "checkpoint_quiz",
            "quiz_id": "qiz_5510"
          }
        ],
        "topics": ["#HeapAllocation", "#CPUCacheLocality", "#PointerOverhead", "#BigONotation"],
        "timestamp": "2:42 PM"
      }
    ]
  }
  ```

#### `POST /api/v1/ai-tutor/sessions/{sessionId}/messages`
* **Description**: Send a message / question to the AI tutor with cognitive mode selector.
* **Request Body**:
  ```json
  {
    "prompt": "How does a linked list actually store nodes in memory compared to an array?",
    "cognitive_mode": "socratic_mentor",
    "quick_switch_mode": "in_depth",
    "attached_image_url": "https://..."
  }
  ```
* **Response `(200 OK / SSE Stream)`**:
  * Streams chunks containing markdown explanations, memory layout diagrams, and interactive Socratic checkpoints.

#### `POST /api/v1/ai-tutor/ocr-scan`
* **Description**: Extract math equations, circuit diagrams, or question prompts from image snapshots.
* **Request (Multipart Form Data)**: `image` (binary file)
* **Response `(200 OK)`**:
  ```json
  {
    "extracted_text": "Derive the closed form time complexity of T(n) = 2T(n/2) + O(n log n)",
    "latex": "T(n) = 2T\\left(\\frac{n}{2}\\right) + \\mathcal{O}(n \\log n)",
    "detected_subject": "Algorithms"
  }
  ```

#### `POST /api/v1/ai-tutor/messages/{messageId}/feedback`
* **Description**: Rate AI tutor response ("Helpful" awards +10 XP, or flag for clarification).
* **Request Body**:
  ```json
  {
    "type": "helpful"
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "status": "acknowledged",
    "xp_awarded": 10,
    "message": "XP Credited! (+10)"
  }
  ```

---

### Study Notes & Flashcards

#### `GET /api/v1/ai-tutor/saved-notes`
* **Description**: Fetch all saved explanations, Newton-Raphson proofs, and formula bookmarks.
* **Response `(200 OK)`**:
  ```json
  {
    "saved_notes": [
      {
        "id": "note_101",
        "title": "Amortized Array Doubling (O(1))",
        "created_at": "2026-09-20"
      },
      {
        "id": "note_102",
        "title": "Newton-Raphson Convergence Proof",
        "created_at": "2026-09-21"
      },
      {
        "id": "note_103",
        "title": "Gray Code Gray-to-Binary Matrix",
        "created_at": "2026-09-22"
      }
    ]
  }
  ```

#### `POST /api/v1/ai-tutor/saved-notes`
* **Description**: Export an AI tutor reasoning block to study notes or flashcards.
* **Request Body**:
  ```json
  {
    "message_id": "msg_002",
    "title": "CPU Cache Locality & RAM Heap Allocation",
    "tags": ["Memory", "CacheLocality", "DSA"]
  }
  ```
* **Response `(201 Created)`**:
  ```json
  {
    "note_id": "note_104",
    "message": "Saved to Study Notes"
  }
  ```

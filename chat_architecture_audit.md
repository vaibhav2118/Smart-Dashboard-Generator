# SmartDG - Chat Architecture Audit

This audit outlines the available intelligence sources generated during the SmartDG pipeline and defines the structure for injecting these elements into the **Context Aggregator** to power the Chat With Dataset copilot.

---

## 1. Existing Intelligence Sources

SmartDG compiles multi-layered analysis outputs for each uploaded dataset. Instead of sending raw row-by-row data to the LLM (which is token-heavy, costly, and unsecured), we aggregate the following pre-computed database elements:

### 1. Dataset Profiles (`dataset_profiles` table)
* **Storage format**: JSON text in `profile_json`.
* **Attributes**: 
  * Shape (`total_rows`, `total_columns`).
  * Classification (lists of `numerical`, `categorical`, `date` columns).
  * Missing value counts.

### 2. KPI Engine (`get_dataset_kpis` API generator)
* **Storage format**: Dynamically calculated from files on disk and returned as labeled values.
* **Attributes**:
  * Quality metrics (missing penalties, duplication percentages, quality score).
  * Core category-specific metrics:
    * *Sales*: Total Revenue, Average Revenue, Orders Count, Top Product, Top Region.
    * *Finance*: Total Profit, Total Revenue, Profit Margin.
    * *HR*: Total Employees, Department Counts.
    * *Inventory*: Total Stock, Categories count.

### 3. Dashboard Metadata (`dashboards` table)
* **Storage format**: Relational columns and JSON array `layout_json`.
* **Attributes**:
  * `dashboard_name`, `dashboard_type`, `description`, `theme`.
  * Visual widget properties (widget title, chart type: line/bar/pie, visibility, and aggregated chart data series).

### 4. Forecast Results (`dataset_forecasts` table)
* **Storage format**: Cache rows mapping `dataset_id`.
* **Attributes**:
  * `model_used` (Prophet, ARIMA, Linear Regression).
  * Configurations (`date_column`, `target_column`, `forecast_horizon`).
  * Analytics metrics (`reliability_score`, `trend_direction` [upward/downward/flat], `growth_rate`).
  * Forecast Coordinates: historical vs future coordinates.

### 5. AI Insights (`dataset_insights` table)
* **Storage format**: Cache rows mapping `dataset_id`.
* **Attributes**:
  * Model specifications (`model_used`, `insight_type`).
  * Qualitative texts: `executive_summary`, `key_findings` (JSON list), `risks` (JSON list), `opportunities` (JSON list), `recommendations` (JSON list), `management_priorities` (JSON list).
  * Confidence ratings.

### 6. Report Summaries (`dataset_reports` table)
* **Storage format**: Report files metadata.
* **Attributes**:
  * `report_name`, `report_type` (Executive, Analytics, Forecast, Full Business), and compiled sections list stored in `report_metadata`.

---

## 2. Context Aggregator Design

To ensure context stays below the **3000-token limit**, the aggregator will parse these 6 databases, strip unnecessary visualization noise (like individual coordinates of forecast plots or detailed theme CSS options), and serialize them into a structured text prompt template.

### Aggregator Serialization Schema
```markdown
[DATASET PROFILE]
Name: sales_q2.csv | Category: Sales Dataset
Rows: 1,250 | Columns: 5
Numerical Columns: Revenue, Profit
Categorical Columns: Product, Region
Date Columns: Order_Date

[KPI METRICS]
Total Revenue: $250,500.00
Average Revenue: $200.40
Top Product: widget_A
Top Region: East
Data Quality Score: 98%

[DASHBOARD LAYOUT]
Name: Sales Analytics Dashboard
Description: Q2 performance metrics
Active Widgets:
- "Revenue Trend" (Line chart)
- "Product Performance" (Bar chart)

[FORECASTING PROJECTIONS]
Target Column: Revenue
Model Used: ARIMA
Projected Growth Rate: +12.5%
Trend Direction: Upward
Model Reliability: 94%

[AI INSIGHTS SUMMARY]
Confidence: 90%
Summary: Sales peaked in May, driven by East region orders. Product B margins declined.
Key Risks:
- High dependency on East region.
- Rising acquisition costs.
Key Opportunities:
- Expand region West marketing.
Recommendations:
- Bundle Product B with high-margin items.

[GENERATED REPORTS]
- "Executive Sales Review Q2" (Executive Report)
- "Full Business Performance Audit" (Full Business Report)
```

---

## 3. Database Schema Recommendations

We will construct two new relational tables for persisting chat history:

### Table: `dataset_chat_sessions`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `user_id` | UUID | Foreign Key (`users.id`, CASCADE) |
| `dataset_id` | UUID | Foreign Key (`datasets.id`, CASCADE) |
| `title` | String | Nullable=False (default: "New Chat") |
| `created_at` | DateTime | default=now |
| `updated_at` | DateTime | default=now, onupdate=now |

### Table: `dataset_chat_messages`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `session_id` | UUID | Foreign Key (`dataset_chat_sessions.id`, CASCADE) |
| `role` | String | Nullable=False ('user', 'assistant', 'system') |
| `content` | Text | Nullable=False |
| `created_at` | DateTime | default=now |

---

## 4. Chat copilot workflow
1. **User asks question**: E.g. "What are the biggest risks to our sales growth?"
2. **Context retrieval**: Aggregates all DB context for the target dataset.
3. **Format prompt**: Blends System Prompt + Serialized Context + Message History + User Question.
4. **OpenAI call**: Calls GPT-4o-mini to produce citation-attributed response.
5. **Session update**: Appends user message and assistant reply to DB, updating `updated_at` timestamp.

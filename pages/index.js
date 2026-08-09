import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// ===== ECHTE V0 — Lychee roadmap-app =====
// Gebouwd naar het demo8-ontwerp dat JW heeft goedgekeurd (zie DECISIONS.md).
// - Docent: eigen leerlingen + maandkalender met afspraken (tijd), kind-pagina
//   met tabbladen Roadmap math / Roadmap literacy / Diary.
// - Roadmap: kettingen per domein uit de echte verbindingenkaart (skills +
//   foundations). Cijfers zijn logboek-regels in "scores"; laatste cijfer per
//   (kind, skill) is de huidige stand. Cijfer >= 5 = beheerst -> volgende
//   steen komt tevoorschijn. Met < > kan je terugbladeren.
// - Dagboek: notities per kind, per semester te downloaden (rapport-basis).
// - Admin (admins-tabel): tabs Students/Teachers incl. Archive, alle
//   kalenders, kinderen toevoegen en toewijzen.
// Alle beveiliging zit in RLS in de database; de app filtert alleen voor de
// duidelijkheid.

const PASS_GRADE = 5;

const houseStyle = `
  :root{
      --paper:#F3F0E7; --panel:#EBE6D8; --card:#EDE9DD; --card-white:#FCFBF8;
          --ink:#2C2A26; --muted:#6B6760; --faint:#9A958A; --rule:rgba(44,42,38,0.14);
              --rust:#B5552D;
                  --student:#C2663C; --student-soft:#FAF0E8;
                      --teacher:#6E8E5B; --teacher-soft:#EEF3E8;
                          --parent:#5E7E9B;  --parent-soft:#EAF0F4;
                              --admin:#8C8678;   --admin-soft:#EFECE3;
                                  --display:"Fraunces",Georgia,serif;
                                      --sans:"Inter","Hanken Grotesk",system-ui,sans-serif;
                                          --mono:"JetBrains Mono",ui-monospace,Consolas,monospace;
                                            }
                                              *{box-sizing:border-box;}
                                                html,body{background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.55;margin:0;}
                                                  h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.01em;margin:0;}
                                                    .accent{font-style:italic;color:var(--rust);}
                                                      .eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);}
                                                        .section-no{font-family:var(--mono);font-size:12px;color:var(--faint);}
                                                          .rule{height:1px;background:var(--rule);border:0;}
                                                            .tag{font-family:var(--mono);font-size:12px;color:var(--muted);background:var(--card);padding:3px 9px;border-radius:6px;display:inline-block;}
                                                              .role-card{background:var(--card);border:1px solid var(--rule);border-left:3px solid var(--student);border-radius:8px;padding:18px 20px;}
                                                                .role-card.teacher{border-left-color:var(--teacher);}
                                                                  .role-card.admin{border-left-color:var(--admin);}
                                                                    .role-card.clickable{cursor:pointer;transition:background .15s;}
                                                                      .role-card.clickable:hover{background:var(--card-white);}
                                                                        .panel{background:var(--panel);border-radius:14px;padding:24px;}
                                                                          .panel .inner{background:var(--card-white);border:1px solid var(--rule);border-radius:8px;padding:14px 16px;}
                                                                            .primary-button{font-family:var(--sans);font-size:14px;font-weight:500;background:var(--ink);color:var(--paper);border:none;border-radius:6px;padding:11px 20px;cursor:pointer;}
                                                                              .primary-button:hover{opacity:.9;}
                                                                                .primary-button:disabled{opacity:.4;cursor:default;}
                                                                                  .link-button{background:none;border:none;font-family:var(--sans);font-size:13px;color:var(--muted);cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px;}
                                                                                    .link-button:hover{color:var(--ink);}
                                                                                      .input,.select{font-family:var(--sans);font-size:14px;color:var(--ink);background:var(--card-white);border:1px solid var(--rule);border-radius:6px;padding:8px 10px;width:100%;}
                                                                                        .field-label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);margin-bottom:6px;}
                                                                                          .view-switch{display:inline-flex;border:1px solid var(--rule);border-radius:8px;overflow:hidden;margin-bottom:32px;}
                                                                                            .view-switch button{font-family:var(--sans);font-size:13px;font-weight:500;padding:9px 18px;border:none;cursor:pointer;background:var(--card-white);color:var(--muted);}
                                                                                              .view-switch button.active-teacher{background:var(--teacher-soft);color:var(--ink);}
                                                                                                .view-switch button.active-admin{background:var(--admin-soft);color:var(--ink);}
                                                                                                  .cal{background:var(--card-white);border:1px solid var(--rule);border-radius:10px;overflow:hidden;}
                                                                                                    .cal-head{display:grid;grid-template-columns:repeat(7,1fr);background:var(--card);}
                                                                                                      .cal-head div{padding:8px 10px;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);text-align:right;}
                                                                                                        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);}
                                                                                                          .cal-day{min-height:86px;min-width:0;border-top:1px solid var(--rule);border-left:1px solid var(--rule);padding:6px 8px;cursor:pointer;}
                                                                                                            .cal-day:nth-child(7n+1){border-left:none;}
                                                                                                              .cal-day:hover{background:var(--paper);}
                                                                                                                .cal-day.selected{background:var(--teacher-soft);}
                                                                                                                  .cal-day .num{font-family:var(--mono);font-size:12px;color:var(--muted);text-align:right;}
                                                                                                                    .cal-day.today .num{color:var(--rust);font-weight:600;}
                                                                                                                      .cal-event{margin-top:4px;font-size:11px;line-height:1.3;border-left:2px solid var(--teacher);background:var(--teacher-soft);border-radius:4px;padding:3px 6px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
                                                                                                                        .cal-event.done{opacity:.45;text-decoration:line-through;}
                                                                                                                          .cal-event .time{font-family:var(--mono);color:var(--muted);margin-right:4px;}
                                                                                                                            .dayview{position:relative;border:1px solid var(--rule);border-radius:10px;background:var(--card-white);overflow:hidden;padding:10px 0;}
                                                                                                                              .dayview .hour-row{position:relative;height:48px;border-top:1px solid var(--rule);}
                                                                                                                                .dayview .hour-row:first-child{border-top:none;}
                                                                                                                                  .dayview .hour-label{position:absolute;top:-7px;left:8px;font-family:var(--mono);font-size:10px;color:var(--faint);background:var(--card-white);padding:0 3px;}
                                                                                                                                    .day-event{position:absolute;border-radius:6px;border-left:3px solid;padding:3px 8px;font-size:12px;line-height:1.35;overflow:hidden;cursor:pointer;box-shadow:0 1px 2px rgba(42,40,32,.08);}
                                                                                                                                      .day-event.done{opacity:.45;text-decoration:line-through;}
                                                                                                                                        .day-event .de-time{font-family:var(--mono);font-size:10px;color:var(--muted);}
                                                                                                                                          .day-event .de-x{position:absolute;top:1px;right:6px;color:var(--faint);font-size:13px;cursor:pointer;}
                                                                                                                                            .day-event .de-x:hover{color:var(--rust);}
                                                                                                                                              .stone{display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid var(--rule);border-radius:8px;background:var(--card-white);}
                                                                                                                                                .dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;border:2px solid var(--faint);background:transparent;}
                                                                                                                                                  .dot.mastered{border-color:var(--teacher);background:var(--teacher);}
                                                                                                                                                    .grade-input{width:58px;font-family:var(--mono);font-size:13px;text-align:center;background:var(--paper);border:1px solid var(--rule);border-radius:6px;padding:5px 4px;color:var(--ink);}
                                                                                                                                                      *:focus-visible{outline:2px solid var(--rust);outline-offset:2px;}
                                                                                                                                                      `;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TEACHER_COLORS = ["#6E8E5B", "#5E7E9B", "#C2663C", "#8C8678"];
const TEACHER_SOFTS = ["#EEF3E8", "#EAF0F4", "#FAF0E8", "#EFECE3"];

// Agenda-categorieën met vaste kleuren (besluit JW 08-08-2026).
const CATEGORIES = [
  { key: "Les geven", color: "#3E7C3E", soft: "#E3EFE3" },
  { key: "Interne meeting", color: "#3B6FB5", soft: "#E4EDF8" },
  { key: "Les voorbereiden", color: "#C0392B", soft: "#FAE4E1" },
  { key: "Overig", color: "#D66BA0", soft: "#FAE6F1" },
  ];
function categoryColor(cat) {
    return CATEGORIES.find((c) => c.key === cat) || CATEGORIES[CATEGORIES.length - 1];
}
function timeToMin(t) {
    if (!t) return null;
    const p = String(t).slice(0, 5).split(":");
    const n = Number(p[0]) * 60 + Number(p[1] || 0);
    return Number.isNaN(n) ? null : n;
}

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonthInfo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based
  const days = new Date(year, month + 1, 0).getDate();
    const lead = (new Date(year, month, 1).getDay() + 6) % 7; // maandag eerst
  const label = now.toLocaleString("en-GB", { month: "long", year: "numeric" });
    return { year, month, days, lead, label };
}

function monthDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function niceDate(ds) {
    const d = new Date(ds + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// Codes als "3.NUM.2" numeriek-bewust sorteren (10 na 2, niet ervoor).
function compareCodes(a, b) {
    const pa = a.split(".");
    const pb = b.split(".");
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
          const na = Number(pa[i]);
          const nb = Number(pb[i]);
          if (!Number.isNaN(na) && !Number.isNaN(nb)) {
                  if (na !== nb) return na - nb;
          } else {
                  const c = String(pa[i] || "").localeCompare(String(pb[i] || ""));
                  if (c !== 0) return c;
          }
    }
    return 0;
}

// ---------------------------------------------------------------------------
// DEMO-PREVIEW (alleen lokaal). Op localhost verschijnt een knop "Preview as
// teacher" op het inlogscherm: de app opent dan met voorbeeldgegevens, zonder
// inloggen en zonder de database te raken. In de productie-build (npm run
// build, dus ook op Vercel) wordt dit blok volledig weggecompileerd.
// ---------------------------------------------------------------------------
const DEV_PREVIEW = process.env.NODE_ENV !== "production";

const DEMO_TEACHER = {
    id: "demo-teacher-1",
    name: "Demo teacher",
    email: "demo@lycheelearning.com",
};

const DEMO_STUDENTS = [
  { id: "demo-s1", name: "Mila", code: "LL.101", location: "Lychee hub", stage_math: "2", stage_literacy: "2", teacher_id: "demo-teacher-1", archived: false },
  { id: "demo-s2", name: "Noah", code: "LL.102", location: "Lychee hub", stage_math: "1", stage_literacy: "1", teacher_id: "demo-teacher-1", archived: false },
  { id: "demo-s3", name: "Sofie", code: "LL.103", location: "Home", stage_math: "3", stage_literacy: "3", teacher_id: "demo-teacher-1", archived: false },
  ];

const DEMO_SKILLS = [
    // Mathematics
  { id: "1.NUM.1", name: "Count to 10", subject: "mathematics", domain: "Numbers", stage: "1" },
  { id: "1.NUM.2", name: "Count to 20", subject: "mathematics", domain: "Numbers", stage: "1" },
  { id: "2.NUM.1", name: "Numbers to 100", subject: "mathematics", domain: "Numbers", stage: "2" },
  { id: "3.NUM.1", name: "Numbers to 1000", subject: "mathematics", domain: "Numbers", stage: "3" },
  { id: "1.ADD.1", name: "Add within 10", subject: "mathematics", domain: "Addition & subtraction", stage: "1" },
  { id: "2.ADD.1", name: "Add within 20", subject: "mathematics", domain: "Addition & subtraction", stage: "2" },
  { id: "2.ADD.2", name: "Subtract within 20", subject: "mathematics", domain: "Addition & subtraction", stage: "2" },
  { id: "3.ADD.1", name: "Add & subtract within 100", subject: "mathematics", domain: "Addition & subtraction", stage: "3" },
  { id: "2.MUL.1", name: "Tables of 1, 2, 5 and 10", subject: "mathematics", domain: "Multiplication", stage: "2" },
  { id: "3.MUL.1", name: "All tables to 10", subject: "mathematics", domain: "Multiplication", stage: "3" },
    // Literacy
  { id: "1.REA.1", name: "Letter sounds", subject: "literacy", domain: "Reading", stage: "1" },
  { id: "1.REA.2", name: "Read short words", subject: "literacy", domain: "Reading", stage: "1" },
  { id: "2.REA.1", name: "Read sentences", subject: "literacy", domain: "Reading", stage: "2" },
  { id: "3.REA.1", name: "Read short stories", subject: "literacy", domain: "Reading", stage: "3" },
  { id: "1.WRI.1", name: "Write letters", subject: "literacy", domain: "Writing", stage: "1" },
  { id: "2.WRI.1", name: "Write words", subject: "literacy", domain: "Writing", stage: "2" },
  { id: "3.WRI.1", name: "Write sentences", subject: "literacy", domain: "Writing", stage: "3" },
  ];

const DEMO_FOUNDATIONS = [
  { skill_id: "1.NUM.2", foundation_skill_id: "1.NUM.1" },
  { skill_id: "2.NUM.1", foundation_skill_id: "1.NUM.2" },
  { skill_id: "3.NUM.1", foundation_skill_id: "2.NUM.1" },
  { skill_id: "1.ADD.1", foundation_skill_id: "1.NUM.1" },
  { skill_id: "2.ADD.1", foundation_skill_id: "1.ADD.1" },
  { skill_id: "2.ADD.2", foundation_skill_id: "2.ADD.1" },
  { skill_id: "3.ADD.1", foundation_skill_id: "2.ADD.2" },
  { skill_id: "2.MUL.1", foundation_skill_id: "2.ADD.1" },
  { skill_id: "3.MUL.1", foundation_skill_id: "2.MUL.1" },
  { skill_id: "1.REA.2", foundation_skill_id: "1.REA.1" },
  { skill_id: "2.REA.1", foundation_skill_id: "1.REA.2" },
  { skill_id: "3.REA.1", foundation_skill_id: "2.REA.1" },
  { skill_id: "1.WRI.1", foundation_skill_id: "1.REA.1" },
  { skill_id: "2.WRI.1", foundation_skill_id: "1.WRI.1" },
  { skill_id: "2.WRI.1", foundation_skill_id: "1.REA.2" },
  { skill_id: "3.WRI.1", foundation_skill_id: "2.WRI.1" },
  { skill_id: "3.WRI.1", foundation_skill_id: "2.REA.1" },
  ];

// Laatste cijfer per (kind, skill) — zoals het uit de scores-tabel zou komen.
const DEMO_SCORES = {
    "demo-s1": { "2.NUM.1": 7, "2.ADD.1": 8, "2.ADD.2": 4, "2.REA.1": 6 },
    "demo-s2": { "1.NUM.1": 6, "1.ADD.1": 7, "1.REA.1": 8 },
    "demo-s3": { "3.NUM.1": 8, "3.ADD.1": 6, "3.REA.1": 9 },
};

const DEMO_DIARY = {
    "demo-s1": [
      { id: "demo-d1", entry_date: "2026-07-30", text: "Worked on subtraction within 20. Still mixing up borrowing — practise with blocks next time.", created_at: "2026-07-30T10:00:00Z" },
      { id: "demo-d2", entry_date: "2026-07-22", text: "Great session: finished addition within 20 with an 8. Very proud of herself.", created_at: "2026-07-22T10:00:00Z" },
        ],
    "demo-s2": [
      { id: "demo-d3", entry_date: "2026-07-28", text: "Letter sounds are solid now. Started blending short words.", created_at: "2026-07-28T10:00:00Z" },
        ],
    "demo-s3": [],
};
  // ---- Hulpjes ----
  function teacherNameFor(teacherId) {
        const t = teachers.find((x) => x.id === teacherId);
        return t ? t.name : teacherRow && teacherRow.id === teacherId ? teacherRow.name : null;
  }

  function teacherColor(teacherId) {
        const idx = Math.max(0, teachers.findIndex((t) => t.id === teacherId));
        return {
                color: TEACHER_COLORS[idx % TEACHER_COLORS.length],
                soft: TEACHER_SOFTS[idx % TEACHER_SOFTS.length],
        };
  }

  async function handleLogin() {
        setErrorMessage("");
        const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin },
        });
        if (error) setErrorMessage(error.message);
  }

  async function handleLogout() {
        if (!demo) await supabase.auth.signOut();
        demoRef.current = false;
        setDemo(false);
        handledUserId.current = null;
        setStatus("signed-out");
        setTeacherRow(null);
        setIsAdmin(false);
        setView("home");
        setActiveStudent(null);
        setMyStudents([]);
        setAllStudents([]);
        setTasks([]);
        setSkills(null);
        setFoundations(null);
        setChildScores({});
        setChildDiary([]);
        setChildBaselines([]);
  }

  const activeAllStudents = allStudents.filter((s) => !s.archived);
  const archivedStudents = allStudents.filter((s) => s.archived);
  const visibleTasks = isAdmin
    ? calFilter === "all"
          ? tasks
          : tasks.filter((t) => t.teacher_id === calFilter)
        : tasks.filter((t) => teacherRow && t.teacher_id === teacherRow.id);
  const dayTasks = selectedDay
    ? visibleTasks
            .filter((t) => t.due_date === selectedDay)
            .sort((a, b) => (a.task_time || "").localeCompare(b.task_time || ""))
        : [];

  return (
        <>
          <Head>
            <title>Lychee Learningpath</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
                    <style>{houseStyle}</style>
            </Head>

      <main style={{ minHeight: "100vh", padding: "48px 24px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <header
            style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 44,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #6E8E5B, #B5552D)",
                                    display: "inline-block",
                }}
              />
              <span style={{ fontFamily: "var(--display)", fontSize: 18 }}>
                Lychee Learning
                  </span>
                  </div>
            <div style={{ textAlign: "right" }}>
              <span className="tag">{demo ? "demo preview" : "roadmap"}</span>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                V0
                  </div>
                  </div>
                  </header>

{status === "loading" && <p style={{ color: "var(--muted)" }}>Loading…</p>}

{status === "signed-out" && (
              <div>
                <h1 style={{ fontSize: 42 }}>Lychee Learningpath</h1>
              <p style={{ color: "var(--muted)", marginTop: 12, marginBottom: 28 }}>
                Log in for teachers
                  </p>
              <button className="primary-button" onClick={handleLogin}>
                                  Log in with Google
                  </button>
{DEV_PREVIEW && (
                  <div style={{ marginTop: 20 }}>
                  <button className="link-button" onClick={startDemo}>
                      Preview as teacher (sample data, local only)
  </button>
  </div>
              )}
</div>
          )}

{status === "not-authorized" && (
              <div>
                <h1 style={{ fontSize: 42 }}>Not authorized</h1>
              <p style={{ color: "var(--muted)", marginTop: 12, marginBottom: 28 }}>
                This Google account isn&rsquo;t on the list of approved teachers
                yet. Contact your administrator if you think this is a mistake.
                  </p>
              <button className="primary-button" onClick={handleLogin}>
                                  Try a different account
                  </button>
                  </div>
          )}

{status === "ready" && view === "child" && activeStudent && (
              <ChildView
               key={activeStudent.id}
              child={activeStudent}
              teacherName={teacherNameFor(activeStudent.teacher_id)}
              skills={skills}
              foundations={foundations}
              scores={childScores}
              diary={childDiary}
              baselines={childBaselines}
              onBack={() => setView("home")}
              onGrade={saveGrade}
              onSetBaseline={saveBaseline}
              onAddDiary={addDiaryEntry}
              onDownloadDiary={downloadDiary}
            />
                          )}

              {status === "ready" && view === "home" && (
                            <>
                             <h1 style={{ fontSize: 38 }}>Welcome, {teacherRow?.name}</h1>
              <p style={{ color: "var(--muted)", marginTop: 10, marginBottom: 40 }}>
                Your <span className="accent">students</span> and your week, in
                one place.
                  </p>

              <SectionHead no="01" title="My students">
                {myStudents.length} {myStudents.length === 1 ? "student" : "students"}
</SectionHead>

{myStudents.length === 0 ? (
                  <div className="panel" style={{ marginBottom: 48 }}>
                  <div className="inner" style={{ textAlign: "center", padding: "28px 20px" }}>
                    <p style={{ color: "var(--muted)", margin: 0, fontSize: 15 }}>
                      You don&rsquo;t have any students yet. Once students are
                      linked to you, they&rsquo;ll appear here.
                        </p>
                        </div>
                        </div>
              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 48 }}>
                {myStudents.map((s) => (
                                    <div
                                                      key={s.id}
                      className="role-card teacher clickable"
                      onClick={() => openChild(s)}
                      style={{ display: "flex", alignItems: "center", gap: 16 }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--display)", fontSize: 18 }}>
{s.name}
{s.code && (
                              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", marginLeft: 10 }}>
{s.code}
</span>
                          )}
</div>
                        <div
                          style={{
                                                        fontFamily: "var(--mono)",
                                                        fontSize: 12,
                                                        color: "var(--muted)",
                                                        marginTop: 5,
                          }}
                        >
{s.location || "No location"} · Math: {s.stage_math || "—"} ·
                          Literacy: {s.stage_literacy || "—"}
</div>
  </div>
                      <span style={{ color: "var(--faint)", fontSize: 18 }}>›</span>
  </div>
                  ))}
                    </div>
              )}

              <CalendarSection
                title="My agenda"
                no="02"
                tasks={visibleTasks}
                selectedDay={selectedDay}
                setSelectedDay={setSelectedDay}
                dayTasks={dayTasks}
                onToggle={toggleTask}
                onRemove={removeTask}
                showTeacher={false}
                teacherNameFor={teacherNameFor}
                teacherColor={teacherColor}
                form={
                                    <form
                    onSubmit={(e) => addTask(e, teacherRow.id)}
                    style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}
                  >
                    <select
                      className="select"
                      style={{ width: 160 }}
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                                                <option key={c.key} value={c.key}>{c.key}</option>
                                                            ))}
</select>
                    <input
                      className="input"
                      type="time"
                      style={{ width: 104 }}
                      value={newTaskTime}
                      onChange={(e) => setNewTaskTime(e.target.value)}
                      title="Start"
                    />
                                            <span style={{ color: "var(--faint)" }}>–</span>
                    <input
                      className="input"
                      type="time"
                      style={{ width: 104 }}
                      value={newTaskEnd}
                      onChange={(e) => setNewTaskEnd(e.target.value)}
                      title="End"
                    />
                                            <input
                      className="input"
                      style={{ width: 110 }}
                      placeholder="LL.___"
                      value={newTaskStudent}
                      onChange={(e) => setNewTaskStudent(e.target.value)}
                      title="Student code (optional)"
                    />
                                            <input
                      className="input"
                      style={{ flex: 1, minWidth: 160 }}
                      placeholder="Add an appointment…"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                                            <button className="primary-button" type="submit">
                                              Add
                        </button>
                        </form>
}
              />

{isAdmin && (
                  <AdminSection
                   adminTab={adminTab}
                   setAdminTab={setAdminTab}
                   activeStudents={activeAllStudents}
                   archivedStudents={archivedStudents}
                   teachers={teachers}
                   expandedTeacherId={expandedTeacherId}
                   setExpandedTeacherId={setExpandedTeacherId}
                   teacherNameFor={teacherNameFor}
                   assignTeacher={assignTeacher}
                   setArchived={setArchived}
                   openChild={openChild}
                   addStudent={addStudent}
                   form={{
                                         newName, setNewName,
                                         newCode, setNewCode,
                                         newLocation, setNewLocation,
                                         newStageMath, setNewStageMath,
                                         newStageLiteracy, setNewStageLiteracy,
                                         newTeacherId, setNewTeacherId,
                   }}
                  calendar={
                                        <CalendarSection
                      title="All calendars"
                      no="04"
                      tasks={calFilter === "all" ? tasks : tasks.filter((t) => t.teacher_id === calFilter)}
                                              selectedDay={selectedDay}
                      setSelectedDay={setSelectedDay}
                      dayTasks={dayTasks}
                      onToggle={toggleTask}
                      onRemove={removeTask}
                      showTeacher={true}
                      teacherNameFor={teacherNameFor}
                      teacherColor={teacherColor}
                      filter={
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                          <label className="eyebrow">Show</label>
                          <select
                            className="select"
                            style={{ width: 200 }}
                            value={calFilter}
                            onChange={(e) => setCalFilter(e.target.value)}
                          >
                                                          <option value="all">All teachers</option>
{teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                              </select>
                          <span style={{ display: "flex", gap: 14, marginLeft: "auto", fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
{teachers.map((t) => (
                                <span key={t.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span
                                  style={{
                                                                        width: 10, height: 10, borderRadius: 3,
                                                                        background: teacherColor(t.id).color,
                                  }}
                                />
{t.name.split(" ")[0]}
</span>
                            ))}
                              </span>
                              </div>
}
                      form={
                                                <form
                          onSubmit={(e) => addTask(e, newTaskTeacher)}
                          style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}
                        >
                          <select
                            className="select"
                            style={{ width: 150 }}
                            value={newTaskTeacher}
                            onChange={(e) => setNewTaskTeacher(e.target.value)}
                          >
                            {teachers.map((t) => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                                      ))}
</select>
                          <select
                            className="select"
                            style={{ width: 150 }}
                            value={newTaskCategory}
                            onChange={(e) => setNewTaskCategory(e.target.value)}
                          >
                            {CATEGORIES.map((c) => (
                                                            <option key={c.key} value={c.key}>{c.key}</option>
                                                                        ))}
</select>
                          <input
                            className="input"
                            type="time"
                            style={{ width: 104 }}
                            value={newTaskTime}
                            onChange={(e) => setNewTaskTime(e.target.value)}
                            title="Start"
                          />
                                                        <span style={{ color: "var(--faint)" }}>–</span>
                          <input
                            className="input"
                            type="time"
                            style={{ width: 104 }}
                            value={newTaskEnd}
                            onChange={(e) => setNewTaskEnd(e.target.value)}
                            title="End"
                          />
                                                        <input
                            className="input"
                            style={{ width: 110 }}
                            placeholder="LL.___"
                            value={newTaskStudent}
                            onChange={(e) => setNewTaskStudent(e.target.value)}
                            title="Student code (optional)"
                          />
                                                        <input
                            className="input"
                            style={{ flex: 1, minWidth: 160 }}
                            placeholder="Add an appointment…"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                          />
                                                        <button className="primary-button" type="submit">
                                                          Add
                              </button>
                              </form>
}
                    />
}
                />
              )}

              <div style={{ marginTop: 56 }}>
                <button className="link-button" onClick={handleLogout}>
                                  Log out
                </button>
                </div>
                </>
          )}

{errorMessage && (
              <p style={{ color: "#a33", marginTop: 16, fontSize: 14 }}>{errorMessage}</p>
          )}

          <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 40 }}>
            V0 · Lychee Learning
              </p>
              </div>
              </main>
              </>
  );
}

function SectionHead({ no, title, children }) {
    return (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <span className="section-no">{no}</span>
        <h2 style={{ flex: 1, fontSize: 24 }}>{title}</h2>
        <span className="eyebrow">{children}</span>
  </div>
      <hr className="rule" style={{ marginTop: 12, marginBottom: 22 }} />
  </>
  );
}

function CalendarSection({
    title, no, tasks, selectedDay, setSelectedDay, dayTasks,
    onToggle, onRemove, showTeacher, teacherNameFor, teacherColor, form, filter,
}) {
    const { year, month, days, lead, label } = currentMonthInfo();
    const today = todayStr();

  return (
        <div style={{ marginBottom: 48 }}>
      <SectionHead no={no} title={title}>
{label} · {tasks.filter((t) => !t.done).length} open
  </SectionHead>

{filter || null}

      <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}>
{CATEGORIES.map((c) => (
            <span key={c.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
{c.key}
</span>
        ))}
</div>

      <div className="cal" style={{ marginBottom: 14 }}>
        <div className="cal-head">
{WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
                        ))}
</div>
        <div className="cal-grid">
{Array.from({ length: lead }).map((_, i) => (
              <div
                                                key={"lead" + i}
              className="cal-day"
              style={{ cursor: "default", background: "var(--paper)" }}
            />
          ))}
{Array.from({ length: days }).map((_, i) => {
              const day = i + 1;
              const ds = monthDateStr(year, month, day);
              const list = tasks
                .filter((t) => t.due_date === ds)
                .sort((a, b) => (a.task_time || "").localeCompare(b.task_time || ""));
              return (
                              <div
                  key={day}
                  className={
                                      "cal-day" + (ds === today ? " today" : "") + (ds === selectedDay ? " selected" : "")
}
                                                  onClick={() => setSelectedDay(ds === selectedDay ? null : ds)}
                title="Click to open this day"
              >
                                  <div className="num">{day}</div>
{list.map((t) => {
                    const cc = categoryColor(t.category);
                    return (
                                          <div
                        key={t.id}
                                className={"cal-event" + (t.done ? " done" : "")}
                      style={{ borderLeftColor: cc.color, background: cc.soft }}
                    >
{t.task_time && <span className="time">{String(t.task_time).slice(0, 5)}</span>}
{t.student_code ? t.student_code + " · " : ""}
{t.title}
</div>
                  );
})}
</div>
            );
})}
</div>
  </div>

{selectedDay && (
          <div className="panel">
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
            <h3 style={{ fontSize: 18, flex: 1 }}>{niceDate(selectedDay)}</h3>
            <button className="link-button" onClick={() => setSelectedDay(null)}>
              Close
                </button>
                </div>

{dayTasks.length === 0 ? (
              <div className="inner" style={{ textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              No appointments on this day yet.
                </div>
          ) : (
                        <DayTimeline
                          list={dayTasks}
                          onToggle={onToggle}
              onRemove={onRemove}
              showTeacher={showTeacher}
              teacherNameFor={teacherNameFor}
            />
                          )}

              {form}
                </div>
      )}
{!selectedDay && (
          <p style={{ color: "var(--faint)", fontSize: 12 }}>
          Click a day to see its appointments and add new ones.
            </p>
      )}
</div>
  );
}

function DayTimeline({ list, onToggle, onRemove, showTeacher, teacherNameFor }) {
    const START = 7 * 60;
    const END = 19 * 60;
    const PXH = 48; // pixels per uur
  const timed = [];
    const untimed = [];
    list.forEach((t) => {
          const s = timeToMin(t.task_time);
          if (s === null) { untimed.push(t); return; }
          let e = timeToMin(t.end_time);
          if (e === null || e <= s) e = s + 60;
          timed.push({ ...t, _s: Math.max(s, START), _e: Math.min(Math.max(e, s + 20), END) });
    });
    const sorted = timed.sort((a, b) => a._s - b._s || a._e - b._e);
    const laneEnds = [];
    sorted.forEach((t) => {
          let lane = laneEnds.findIndex((end) => end <= t._s);
          if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
          laneEnds[lane] = t._e;
          t._lane = lane;
    });
    const lanes = Math.max(1, laneEnds.length);
    const hours = [];
    for (let h = 7; h < 19; h++) hours.push(h);

  return (
        <div>
  {untimed.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
{untimed.map((t) => {
              const cc = categoryColor(t.category);
              return (
                              <div
                  key={t.id}
                             className="inner"
                 style={{ display: "flex", alignItems: "center", gap: 10, borderLeft: "3px solid " + cc.color, background: cc.soft, cursor: "pointer" }}
                onClick={() => onToggle(t)}
              >
                                  <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? "line-through" : "none" }}>
{t.student_code ? t.student_code + " · " : ""}{t.title}
</span>
{showTeacher && teacherNameFor(t.teacher_id) && <span className="tag">{teacherNameFor(t.teacher_id)}</span>}
                 <button className="link-button" onClick={(e) => { e.stopPropagation(); onRemove(t); }} title="Remove">×</button>
  </div>
            );
})}
</div>
      )}
      <div className="dayview">
      {hours.map((h) => (
                  <div key={h} className="hour-row">
                    <span className="hour-label">{String(h).padStart(2, "0")}:00</span>
        </div>
        ))}
        <div style={{ position: "absolute", top: 10, left: 56, right: 8, bottom: 10 }}>
{sorted.map((t) => {
              const cc = categoryColor(t.category);
              const top = ((t._s - START) / 60) * PXH;
              const height = Math.max(22, ((t._e - t._s) / 60) * PXH - 2);
              const width = 100 / lanes;
              return (
                              <div
                  key={t.id}
                            className={"day-event" + (t.done ? " done" : "")}
                style={{
                                    top, height,
                                    left: t._lane * width + "%",
                                    width: "calc(" + width + "% - 6px)",
                                    borderLeftColor: cc.color,
                                    background: cc.soft,
                }}
                onClick={() => onToggle(t)}
                title="Click to mark done / not done"
              >
                                  <span className="de-time">
                {String(t.task_time).slice(0, 5)}
{t.end_time ? "–" + String(t.end_time).slice(0, 5) : ""}
</span>
                <span className="de-x" onClick={(e) => { e.stopPropagation(); onRemove(t); }} title="Remove">×</span>
                <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
{t.student_code ? t.student_code + " · " : ""}{t.title}
</div>
{showTeacher && teacherNameFor(t.teacher_id) && height > 40 && (
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{teacherNameFor(t.teacher_id)}</div>
                )}
</div>
            );
})}
</div>
  </div>
      <p style={{ color: "var(--faint)", fontSize: 11, marginTop: 8 }}>
        Click a block to mark it done · × removes it
          </p>
          </div>
  );
}

function AdminSection({
    adminTab, setAdminTab, activeStudents, archivedStudents, teachers,
    expandedTeacherId, setExpandedTeacherId, teacherNameFor,
    assignTeacher, setArchived, openChild, addStudent, form, calendar,
}) {
    return (
          <div style={{ marginTop: 8 }}>
      <SectionHead
        no="03"
        title={adminTab === "students" ? "All students" : "Teachers"}
                >
                  Admin ·{" "}
{adminTab === "students"
           ? `${activeStudents.length} active`
            : `${teachers.length} teachers · ${archivedStudents.length} archived`}
</SectionHead>

      <div className="view-switch" style={{ marginBottom: 20 }}>
        <button
          className={adminTab === "students" ? "active-admin" : ""}
                      onClick={() => setAdminTab("students")}
        >
          Students
            </button>
        <button
          className={adminTab === "teachers" ? "active-admin" : ""}
                      onClick={() => setAdminTab("teachers")}
        >
          Teachers
            </button>
            </div>

{adminTab === "students" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
{activeStudents.map((s) => (
                <div
                                    key={s.id}
                className="role-card admin"
                style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
              >
                <div
                  style={{ flex: 1, minWidth: 180, cursor: "pointer" }}
                  onClick={() => openChild(s)}
                  title="Open this student"
                >
                                      <div style={{ fontFamily: "var(--display)", fontSize: 17 }}>
{s.name}
{s.code && (
                        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", marginLeft: 10 }}>
{s.code}
</span>
                    )}
</div>
                  <div
                    style={{
                                            fontFamily: "var(--mono)", fontSize: 12,
                                            color: "var(--muted)", marginTop: 5,
                    }}
                  >
{s.location || "No location"} · Math: {s.stage_math || "—"} · Literacy:{" "}
{s.stage_literacy || "—"}
</div>
  </div>
                <div style={{ width: 200 }}>
                  <label className="field-label">Teacher</label>
                  <select
                    className="select"
                    value={s.teacher_id || ""}
                    onChange={(e) => assignTeacher(s.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
{teachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                      </select>
                      </div>
                <button
                  className="link-button"
                  onClick={() => setArchived(s.id, true)}
                  title="Move to archive"
                >
                                      Archive
                    </button>
                    </div>
            ))}
              </div>

          <div className="panel" style={{ marginBottom: 48 }}>
            <p className="eyebrow" style={{ margin: "0 0 14px", textAlign: "center" }}>
              Add a student
                </p>
            <form
              onSubmit={addStudent}
              className="inner"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="field-label">Name</label>
                <input
                  className="input"
                  value={form.newName}
                  onChange={(e) => form.setNewName(e.target.value)}
                  placeholder="Full name"
                  required
                />
                    </div>
              <div>
                                    <label className="field-label">Student code</label>
                <input
                  className="input"
                  value={form.newCode}
                  onChange={(e) => form.setNewCode(e.target.value)}
                  placeholder="LL.003"
                />
                    </div>
              <div>
                                    <label className="field-label">Location</label>
                <select
                  className="select"
                  value={form.newLocation}
                  onChange={(e) => form.setNewLocation(e.target.value)}
                >
                                      <option>Lychee hub</option>
                  <option>Elements hub</option>
                  <option>Online</option>
                    </select>
                    </div>
              <div>
                                    <label className="field-label">Teacher</label>
                <select
                  className="select"
                  value={form.newTeacherId}
                  onChange={(e) => form.setNewTeacherId(e.target.value)}
                >
                                      <option value="">Unassigned</option>
{teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                    </select>
                    </div>
              <div>
                                    <label className="field-label">Stage math</label>
                <input
                  className="input"
                  value={form.newStageMath}
                  onChange={(e) => form.setNewStageMath(e.target.value)}
                  placeholder="e.g. 3"
                />
                    </div>
              <div>
                                    <label className="field-label">Stage literacy</label>
                <input
                  className="input"
                  value={form.newStageLiteracy}
                  onChange={(e) => form.setNewStageLiteracy(e.target.value)}
                  placeholder="e.g. 2"
                />
                    </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <button className="primary-button" type="submit">
                                      Add student
                    </button>
                    </div>
                    </form>
                    </div>
                    </>
      )}

{adminTab === "teachers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 48 }}>
{teachers.map((t) => {
              const theirStudents = activeStudents.filter((s) => s.teacher_id === t.id);
              const expanded = expandedTeacherId === t.id;
              return (
                              <div key={t.id} className="role-card teacher">
                  <div
                   style={{ display: "flex", alignItems: "baseline", gap: 12, cursor: "pointer" }}
                  onClick={() => setExpandedTeacherId(expanded ? null : t.id)}
                  title="Click to show students"
                >
                                      <div style={{ fontFamily: "var(--display)", fontSize: 18, flex: 1 }}>
{t.name}
</div>
                  <span className="eyebrow">
{theirStudents.length} {theirStudents.length === 1 ? "student" : "students"}
</span>
                  <span style={{ color: "var(--faint)", fontSize: 14 }}>
{expanded ? "▾" : "▸"}
</span>
  </div>
{expanded &&
                    (theirStudents.length > 0 ? (
                                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                     {theirStudents.map((s) => (
                                              <div
                                                 key={s.id}
                                                 className="stone"
                                                 style={{ padding: "8px 14px", cursor: "pointer" }}
                                                 onClick={() => openChild(s)}
                                                 title="Open this student"
                                               >
                                                 <span style={{ flex: 1, fontSize: 14 }}>{s.name}</span>
                                                 <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>
                                                   Math: {s.stage_math || "—"} · Lit: {s.stage_literacy || "—"}
                       </span>
                                                 <span style={{ color: "var(--faint)" }}>›</span>
                       </div>
                                             ))}
                       </div>
                                         ) : (
                                                                       <p style={{ color: "var(--faint)", fontSize: 13, margin: "10px 0 0" }}>
                                                                         No students assigned.
                                                   </p>
                                                                     ))}
                     </div>
                                 );
})}

{activeStudents.filter((s) => !s.teacher_id).length > 0 && (
              <div className="role-card admin">
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <div style={{ fontFamily: "var(--display)", fontSize: 18, flex: 1 }}>
                  Unassigned
                    </div>
                <span className="eyebrow">
                  {activeStudents.filter((s) => !s.teacher_id).length} students
                    </span>
                    </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
{activeStudents
                  .filter((s) => !s.teacher_id)
                   .map((s) => (
                                         <div
                                              key={s.id}
                      className="stone"
                      style={{ padding: "8px 14px", cursor: "pointer" }}
                      onClick={() => openChild(s)}
                    >
                      <span style={{ flex: 1, fontSize: 14 }}>{s.name}</span>
                      <span style={{ color: "var(--faint)" }}>›</span>
                      </div>
                  ))}
                    </div>
                    </div>
          )}

          <div className="role-card admin" style={{ background: "var(--admin-soft)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontFamily: "var(--display)", fontSize: 18, flex: 1 }}>
                Archive
                  </div>
              <span className="eyebrow">
                {archivedStudents.length} {archivedStudents.length === 1 ? "student" : "students"}
</span>
  </div>
{archivedStudents.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
{archivedStudents.map((s) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ flex: 1, fontSize: 14, color: "var(--muted)" }}>{s.name}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--faint)" }}>
                      was: {teacherNameFor(s.teacher_id) || "Unassigned"}
</span>
                    <button className="link-button" onClick={() => setArchived(s.id, false)}>
                      Restore
                        </button>
                        </div>
                ))}
                  </div>
            ) : (
                            <p style={{ color: "var(--faint)", fontSize: 13, margin: "10px 0 0" }}>
                              Students who stop are moved here, so the lists stay clean. Their
                roadmap, grades and diary are kept.
                  </p>
            )}
</div>
  </div>
      )}

{calendar}
</div>
  );
}

// ---- Kind-pagina ----

const SUBJECT_KEYS = { math: "mathematics", literacy: "literacy" };

// Stage-tekst ("3") naar getal; onbekend = 0.
function stageNum(stage) {
    const n = parseInt(stage, 10);
    return Number.isNaN(n) ? 0 : n;
}

function ChildView({
    child, teacherName, skills, foundations, scores, diary, baselines,
    onBack, onGrade, onAddDiary, onDownloadDiary, onSetBaseline,
}) {
    const [tab, setTab] = useState("math");
    const [viewIdx, setViewIdx] = useState({}); // per domein: bekeken index
  const [showIntake, setShowIntake] = useState(false);
    const [intakeSaved, setIntakeSaved] = useState(null); // domein met "Saved" melding
  const [entryText, setEntryText] = useState("");
    const [entryDate, setEntryDate] = useState(todayStr());
    const [semester, setSemester] = useState(
          new Date().getMonth() < 6 ? "S1" : "S2"
        );

  // Inschaling: alles ONDER deze stage telt als "aanwezig verondersteld",
  // tenzij er een expliciet cijfer staat (dat wint altijd).
  const startStage = stageNum(
        tab === "literacy" ? child.stage_literacy : child.stage_math
      );

  const skillById = useMemo(() => {
        const m = new Map();
        (skills || []).forEach((s) => m.set(s.id, s));
        return m;
  }, [skills]);

  const foundationsBySkill = useMemo(() => {
        const m = new Map();
        (foundations || []).forEach((f) => {
                if (!m.has(f.skill_id)) m.set(f.skill_id, []);
                m.get(f.skill_id).push(f.foundation_skill_id);
        });
        return m;
  }, [foundations]);

  // Startpunten uit de intake: per domein hooguit één skill-id; alles wat
  // (op codevolgorde) vóór dat punt ligt telt als aanwezig verondersteld.
  const baselineByDomain = useMemo(() => {
        const m = new Map();
        (baselines || []).forEach((id) => {
                const s = skillById.get(id);
                if (s) m.set(s.subject + "|" + (s.domain || "Other"), id);
        });
        return m;
  }, [baselines, skillById]);

  function isAssumed(skillId) {
        if (scores[skillId] != null) return false;
        const s = skillById.get(skillId);
        if (!s) return false;
        // Heeft dit domein een eigen intake-punt? Dan is DAT leidend: alleen
      // wat ervoor ligt telt als aanwezig — de globale stage-aanname geldt
      // dan niet meer voor dit domein (zo kan je ook eerder starten dan de
      // stage zou aannemen).
      const baseline = baselineByDomain.get(s.subject + "|" + (s.domain || "Other"));
        if (baseline) return compareCodes(skillId, baseline) < 0;
        return stageNum(s.stage) < startStage;
  }

  function isPassed(skillId) {
        const grade = scores[skillId];
        if (grade != null) return grade >= PASS_GRADE;
        return isAssumed(skillId);
  }

  function foundationsMet(skillId) {
        return (foundationsBySkill.get(skillId) || []).every((fid) => isPassed(fid));
  }

  // Kettingen per domein, maar de KAART bepaalt wat mag: een skill is pas
  // aan de beurt als al zijn fundamenten (ook uit andere domeinen) binnen
  // zijn.
  let chains = null;
    if (tab !== "diary" && skills && foundations) {
          const subjectKey = SUBJECT_KEYS[tab];
          const subjectSkills = skills.filter((s) => s.subject === subjectKey);
          const byDomain = new Map();
          subjectSkills.forEach((s) => {
                  const d = s.domain || "Other";
                  if (!byDomain.has(d)) byDomain.set(d, []);
                  byDomain.get(d).push(s);
          });
          chains = Array.from(byDomain.keys())
            .sort()
            .map((domain) => {
                      const stones = byDomain
                        .get(domain)
                        .sort((a, b) => compareCodes(a.id, b.id));
                      let current = stones.findIndex((s) => !isPassed(s.id));
                      const allPassed = current === -1;
                      if (allPassed) current = stones.length - 1;
                      // Een domein is pas "open" als de eerstvolgende skill echt kan:
                         // alle fundamenten binnen. Skills die nergens op leunen (startpunten
                         // van de kaart) gaan alleen open als hun stage past bij waar het
                         // kind is — anders zou bijv. een stage-6 capstone meteen openstaan.
                         const cur = stones[current];
                      const hasFoundations = (foundationsBySkill.get(cur.id) || []).length > 0;
                      const stageOk =
                                  hasFoundations || stageNum(cur.stage) <= Math.max(startStage, 1);
                      const unlocked = allPassed || (foundationsMet(cur.id) && stageOk);
                      return { domain, stones, current, allPassed, unlocked };
            });
    }

  const openChains = chains ? chains.filter((g) => g.unlocked) : null;
    const lockedChains = chains ? chains.filter((g) => !g.unlocked) : null;

  function nav(domain, current, delta) {
        setViewIdx((prev) => {
                const cur = prev[tab + domain] ?? current;
                const next = Math.max(0, Math.min(current, cur + delta));
                return { ...prev, [tab + domain]: next };
        });
  }

  return (
        <div>
          <button className="link-button" onClick={onBack} style={{ marginBottom: 24 }}>
        ‹ Back to overview
          </button>

      <h1 style={{ fontSize: 34 }}>{child.name}</h1>
      <div
        style={{
                    fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)",
                    marginTop: 10, marginBottom: 6,
        }}
      >
{child.location || "No location"} · Math: {child.stage_math || "—"} · Literacy:{" "}
{child.stage_literacy || "—"}
</div>
      <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 28 }}>
        Teacher: {teacherName || "Unassigned"}
</div>

      <div className="view-switch">
          <button className={tab === "math" ? "active-teacher" : ""} onClick={() => setTab("math")}>
          Roadmap math
            </button>
        <button className={tab === "literacy" ? "active-teacher" : ""} onClick={() => setTab("literacy")}>
          Roadmap literacy
            </button>
        <button className={tab === "diary" ? "active-teacher" : ""} onClick={() => setTab("diary")}>
          Diary
            </button>
            </div>

{tab !== "diary" && (
          <>
            <SectionHead no="01" title={tab === "math" ? "Math roadmap" : "Literacy roadmap"}>
              Grade ≥ {PASS_GRADE} unlocks the next skill
  </SectionHead>

 {chains && chains.length > 0 && (
               <div style={{ marginBottom: 20 }}>
              <button
                 className="link-button"
                 onClick={() => setShowIntake(!showIntake)}
               >
                 {showIntake ? "Hide intake" : "Intake · set start point per domain"}
</button>
  </div>
          )}

{showIntake && chains && chains.length > 0 && (
              <div className="panel" style={{ marginBottom: 28 }}>
              <p className="eyebrow" style={{ margin: "0 0 12px" }}>
                Intake — where does this student start?
                  </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
{chains.map((g) => {
                    const domainKey = SUBJECT_KEYS[tab] + "|" + g.domain;
                    const value = baselineByDomain.get(domainKey) || "";
                    const ids = g.stones.map((s) => s.id);
                    return (
                                          <div
                        key={g.domain}
                                  className="inner"
                       style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
                    >
                      <span style={{ width: 190, fontSize: 14 }}>{g.domain}</span>
                      <select
                        className="select"
                        style={{ flex: 1, minWidth: 220 }}
                        value={value}
                        onChange={(e) => {
                                                    onSetBaseline(ids, e.target.value);
                                                    setIntakeSaved(g.domain);
                        }}
                      >
                                                  <option value="">From the beginning</option>
{g.stones.map((s) => (
                            <option key={s.id} value={s.id}>
                            starts at {s.id} — {s.name}
</option>
                        ))}
                          </select>
{intakeSaved === g.domain && (
                          <span className="eyebrow" style={{ color: "var(--teacher)" }}>
                          Saved ✓
                            </span>
                      )}
</div>
                  );
})}
</div>
              <div
                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    marginTop: 14,
                }}
              >
                <button
                  className="primary-button"
                  onClick={() => {
                                        setShowIntake(false);
                                        setIntakeSaved(null);
                  }}
                >
                                      Done
                    </button>
                <p style={{ fontSize: 12, color: "var(--faint)", margin: 0 }}>
                  Choices are saved instantly. Everything before the chosen
                  skill counts as present from intake; a real grade always wins.
                    </p>
                    </div>
                    </div>
          )}

{chains === null ? (
              <p style={{ color: "var(--muted)" }}>Loading the skills map…</p>
            ) : chains.length === 0 ? (
              <div className="panel">
                <div className="inner" style={{ textAlign: "center", padding: "28px 20px" }}>
                <p style={{ color: "var(--muted)", margin: 0, fontSize: 15 }}>
                  No {tab} map loaded yet. It can be added later without any
                  structural changes.
                    </p>
                    </div>
                    </div>
          ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {openChains.map((group) => {
                            const key = tab + group.domain;
                            const rawView = viewIdx[key] ?? group.current;
                            const view = Math.max(0, Math.min(group.current, rawView));
                            const stone = group.stones[view];
                            if (!stone) return null;
                            const atCurrent = view === group.current;
                            const grade = scores[stone.id] ?? null;
                            const frontier = !isPassed(stone.id) && foundationsMet(stone.id);
                            const mastered = group.allPassed && atCurrent;
                            const stoneFoundations = (foundationsBySkill.get(stone.id) || [])
                              .map((fid) => skillById.get(fid))
                              .filter(Boolean)
                              .sort((a, b) => compareCodes(a.id, b.id));

                                            const label = atCurrent
                              ? mastered
                                                                  ? "All skills mastered"
                                                                  : frontier
                                                                  ? "New skill"
                                                                  : "Waiting on foundations"
                                                                : `Earlier skill (${view + 1}/${group.current + 1})`;

                                            return (
                                                                <div key={group.domain}>
                                                <h3 style={{ fontSize: 19, marginBottom: 12 }}>{group.domain}</h3>

                    <div
                      className="role-card teacher"
                      style={{
                                                background: atCurrent ? "var(--teacher-soft)" : "var(--card)",
                                                marginBottom: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <button
                          className="link-button"
                          style={{ fontSize: 16, visibility: view > 0 ? "visible" : "hidden" }}
                          onClick={() => nav(group.domain, group.current, -1)}
                          title="Previous skill"
                        >
                                                      ‹
                            </button>
                        <span
                          className="eyebrow"
                          style={{
                                                        flex: 1, textAlign: "center",
                                                        color:
                                                                                        atCurrent && frontier && !mastered
                                                            ? "var(--rust)"
                                                                                          : "var(--faint)",
                          }}
                        >
{label}
</span>
                        <button
                          className="link-button"
                          style={{ fontSize: 16, visibility: !atCurrent ? "visible" : "hidden" }}
                          onClick={() => nav(group.domain, group.current, 1)}
                          title="Next (up to where the student is now)"
                        >
                                                      ›
                            </button>
                            </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", minWidth: 70 }}>
{stone.id}
</span>
                        <span style={{ flex: 1, fontFamily: "var(--display)", fontSize: 17, minWidth: 160 }}>
{stone.name}
</span>
                        <label className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          Grade
                          <input
                            key={stone.id + String(grade)}
                            className="grade-input"
                            type="number"
                            min="1"
                            max="10"
                            placeholder="—"
                            defaultValue={grade == null ? "" : grade}
                                                          onBlur={(e) => onGrade(stone.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.target.blur();
                            }}
                          />
                            </label>
                            </div>
                            </div>

{stoneFoundations.length > 0 && (
                        <>
                          <p className="eyebrow" style={{ margin: "14px 0 8px" }}>
                          Foundation skills
                            </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
{stoneFoundations.map((f) => {
                              const fGrade = scores[f.id] ?? null;
                              return (
                                                              <div key={f.id} className="stone" style={{ padding: "8px 14px" }}>
                                <span className={"dot" + (isPassed(f.id) ? " mastered" : "")} />
                                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--faint)", minWidth: 70 }}>
{f.id}
</span>
                                <span style={{ flex: 1, fontSize: 14, color: "var(--muted)" }}>
{f.name}
</span>
{isAssumed(f.id) && (
                                    <span className="tag" title={`Assumed present: below start stage ${startStage}`}>
                                    intake
                                      </span>
                                )}
                                <input
                                  key={f.id + String(fGrade)}
                                  className="grade-input"
                                  type="number"
                                  min="1"
                                  max="10"
                                  placeholder="—"
                                  defaultValue={fGrade == null ? "" : fGrade}
                                                                      onBlur={(e) => onGrade(f.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") e.target.blur();
                                  }}
                                  title="Grade (1–10) — editable"
                                />
                                    </div>
                            );
})}
  </div>
  </>
                    )}
</div>
                );
})}
</div>
          )}

{lockedChains && lockedChains.length > 0 && (
              <div style={{ marginTop: 32 }}>
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Not unlocked yet
                  </p>
              <p style={{ fontSize: 13, color: "var(--faint)", margin: 0 }}>
{lockedChains
                  .map((g) => `${g.domain} (from ${g.stones[g.current].id})`)
                   .join(" · ")}{" "}
                — these appear automatically once their foundation skills are
                passed.
                  </p>
                  </div>
          )}

          <p style={{ marginTop: 32, fontSize: 12, color: "var(--muted)" }}>
            The connections map decides the path: a skill only becomes
            &ldquo;New skill&rdquo; once all of its foundation skills are
            passed ({PASS_GRADE} or higher) — including foundations from other
            domains. Skills below the student&rsquo;s start stage (
              {startStage || "—"}) count as present from intake, unless a grade
            says otherwise. Every grade is saved as a dated entry in the log.
              </p>
              </>
      )}

{tab === "diary" && (
          <>
            <SectionHead no="01" title="Diary">
{diary.length} {diary.length === 1 ? "entry" : "entries"}
</SectionHead>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div
              style={{
                                display: "flex", gap: 10, alignItems: "center",
                                marginBottom: 12, flexWrap: "wrap",
              }}
            >
              <span className="eyebrow" style={{ flex: 1 }}>
                Download for report
                  </span>
              <select
                className="select"
                style={{ width: 190 }}
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                                  <option value="S1">Semester 1 (Jan–Jun)</option>
                <option value="S2">Semester 2 (Jul–Dec)</option>
                  </select>
              <button className="primary-button" onClick={() => onDownloadDiary(semester)}>
                Download
                  </button>
                  </div>
            <form
              className="inner"
              onSubmit={(e) => {
                                e.preventDefault();
                                onAddDiary(entryDate, entryText);
                                setEntryText("");
              }}
            >
                              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <input
                  className="input"
                  type="date"
                  style={{ width: 160 }}
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
                    </div>
              <textarea
                className="input"
                rows={3}
                placeholder="Write a note about this student… (what you worked on, how it went, what to pick up next time)"
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                style={{ resize: "vertical", marginBottom: 10 }}
              />
              <button className="primary-button" type="submit">
                                Add entry
                </button>
                </form>
                </div>

{diary.length === 0 ? (
              <div className="panel">
                <div className="inner" style={{ textAlign: "center", padding: "24px 20px" }}>
                <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
                  No diary entries yet. Notes you write here become the basis
                  for the semester report.
                    </p>
                    </div>
                    </div>
          ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {diary.map((entry) => (
                            <div key={entry.id} className="role-card teacher">
                              <div
                    style={{
                                            fontFamily: "var(--mono)", fontSize: 12,
                                            color: "var(--faint)", marginBottom: 6,
                    }}
                  >
{entry.entry_date}
</div>
                  <div style={{ fontSize: 14, color: "var(--ink)" }}>{entry.text}</div>
  </div>
              ))}
                </div>
          )}
</>
      )}
</div>
  );
}

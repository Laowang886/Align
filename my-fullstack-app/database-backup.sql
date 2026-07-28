--
-- PostgreSQL database dump
--

\restrict KC1SmA1AdUJBf9NCAdZrwcVfdBjuQMj0retnPHr3CjcacDQJjl5L6qo8DnXG9A3

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: dev
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO dev;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: dev
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ColumnCategory; Type: TYPE; Schema: public; Owner: dev
--

CREATE TYPE public."ColumnCategory" AS ENUM (
    'BACKLOG',
    'TODO',
    'IN_PROGRESS',
    'REVIEW',
    'DONE'
);


ALTER TYPE public."ColumnCategory" OWNER TO dev;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: dev
--

CREATE TYPE public."NotificationType" AS ENUM (
    'WORKSPACE_CHAT_MESSAGE',
    'TASK_ASSIGNED'
);


ALTER TYPE public."NotificationType" OWNER TO dev;

--
-- Name: SprintStatus; Type: TYPE; Schema: public; Owner: dev
--

CREATE TYPE public."SprintStatus" AS ENUM (
    'PLANNED',
    'ACTIVE',
    'COMPLETED'
);


ALTER TYPE public."SprintStatus" OWNER TO dev;

--
-- Name: TaskPriority; Type: TYPE; Schema: public; Owner: dev
--

CREATE TYPE public."TaskPriority" AS ENUM (
    'URGENT',
    'HIGH',
    'MEDIUM',
    'LOW'
);


ALTER TYPE public."TaskPriority" OWNER TO dev;

--
-- Name: WorkspaceRole; Type: TYPE; Schema: public; Owner: dev
--

CREATE TYPE public."WorkspaceRole" AS ENUM (
    'OWNER',
    'ADMIN',
    'MEMBER'
);


ALTER TYPE public."WorkspaceRole" OWNER TO dev;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."ActivityLog" (
    id text NOT NULL,
    "workspaceId" text NOT NULL,
    "actorId" text,
    "projectId" text,
    action text NOT NULL,
    "resourceType" text NOT NULL,
    "resourceId" text,
    summary text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ActivityLog" OWNER TO dev;

--
-- Name: Board; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."Board" (
    id text NOT NULL,
    title text NOT NULL,
    "projectId" text NOT NULL
);


ALTER TABLE public."Board" OWNER TO dev;

--
-- Name: Channel; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."Channel" (
    id text NOT NULL,
    name text NOT NULL,
    "teamId" text NOT NULL,
    notice text
);


ALTER TABLE public."Channel" OWNER TO dev;

--
-- Name: Column; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."Column" (
    id text NOT NULL,
    title text NOT NULL,
    "order" integer NOT NULL,
    "boardId" text NOT NULL,
    color text DEFAULT 'gray'::text NOT NULL,
    category public."ColumnCategory" DEFAULT 'TODO'::public."ColumnCategory" NOT NULL
);


ALTER TABLE public."Column" OWNER TO dev;

--
-- Name: FeedbackSubmission; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."FeedbackSubmission" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."FeedbackSubmission" OWNER TO dev;

--
-- Name: Message; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    content text NOT NULL,
    "channelId" text NOT NULL,
    "authorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Message" OWNER TO dev;

--
-- Name: MessageAttachment; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."MessageAttachment" (
    id text NOT NULL,
    "messageId" text NOT NULL,
    "originalName" text NOT NULL,
    "storedName" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    "storagePath" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MessageAttachment" OWNER TO dev;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "recipientId" text NOT NULL,
    "actorId" text,
    "workspaceId" text,
    "projectId" text,
    "taskId" text,
    "messageId" text,
    type public."NotificationType" NOT NULL,
    "eventId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    link text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "readAt" timestamp(3) without time zone
);


ALTER TABLE public."Notification" OWNER TO dev;

--
-- Name: NotificationPreference; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."NotificationPreference" (
    "userId" text NOT NULL,
    "notificationsEnabled" boolean DEFAULT true NOT NULL,
    "kanbanNotificationsEnabled" boolean DEFAULT true NOT NULL,
    "chatNotificationsEnabled" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."NotificationPreference" OWNER TO dev;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    "workspaceId" text NOT NULL,
    name text NOT NULL,
    key text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    color text DEFAULT '#6366f1'::text NOT NULL
);


ALTER TABLE public."Project" OWNER TO dev;

--
-- Name: SafetyReport; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."SafetyReport" (
    id text NOT NULL,
    "userId" text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SafetyReport" OWNER TO dev;

--
-- Name: Sprint; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."Sprint" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    name text NOT NULL,
    goal text DEFAULT ''::text NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    status public."SprintStatus" DEFAULT 'PLANNED'::public."SprintStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Sprint" OWNER TO dev;

--
-- Name: Task; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."Task" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "order" integer NOT NULL,
    "columnId" text NOT NULL,
    "assigneeId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    code text DEFAULT ''::text NOT NULL,
    priority public."TaskPriority" DEFAULT 'MEDIUM'::public."TaskPriority" NOT NULL,
    "dueDate" date,
    "storyPoints" integer,
    "sprintId" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Task" OWNER TO dev;

--
-- Name: Team; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."Team" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    "ownerId" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Team" OWNER TO dev;

--
-- Name: TeamMember; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."TeamMember" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "teamId" text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role public."WorkspaceRole" DEFAULT 'MEMBER'::public."WorkspaceRole" NOT NULL
);


ALTER TABLE public."TeamMember" OWNER TO dev;

--
-- Name: User; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "avatarUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "passwordHash" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    provider text,
    "providerId" text,
    "avatarColor" text
);


ALTER TABLE public."User" OWNER TO dev;

--
-- Name: WikiDocument; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."WikiDocument" (
    id text NOT NULL,
    "workspaceId" text NOT NULL,
    "projectId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "createdById" text NOT NULL,
    "updatedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."WikiDocument" OWNER TO dev;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO dev;

--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."ActivityLog" (id, "workspaceId", "actorId", "projectId", action, "resourceType", "resourceId", summary, "createdAt") FROM stdin;
fee2e22d-d024-440b-9c31-d80efca615f3	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	b5d5b03f-ae5d-4df4-9458-34896aa6f596	\N	created workspace	WORKSPACE	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	TEST	2026-07-18 23:59:34.972
0f33020e-ea66-4737-9e96-1f7a00b14463	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	b5d5b03f-ae5d-4df4-9458-34896aa6f596	30780b86-72e0-41bc-96ac-cf1ecbf8fe30	created project	PROJECT	30780b86-72e0-41bc-96ac-cf1ecbf8fe30	TEST	2026-07-19 00:00:19.731
fdbe95a0-95bb-42ff-a064-1a6dbc280338	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	b5d5b03f-ae5d-4df4-9458-34896aa6f596	\N	invited member	WORKSPACE_MEMBER	53b9eeed-0e2d-4cca-abe3-38741e094132	renbo joined as MEMBER	2026-07-19 00:01:25.449
19fbe530-1e8d-47c2-aeea-cd7839a4c534	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	b5d5b03f-ae5d-4df4-9458-34896aa6f596	30780b86-72e0-41bc-96ac-cf1ecbf8fe30	created task	TASK	9b0486c8-2752-480f-8d49-185da703f585	WEB-1 test	2026-07-19 17:42:43.594
5de4a0f5-65f7-4034-9d78-60cdf35c5d2e	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	b5d5b03f-ae5d-4df4-9458-34896aa6f596	30780b86-72e0-41bc-96ac-cf1ecbf8fe30	created task	TASK	ab28773a-25b3-4cff-92c8-5e5853c14634	WEB-2 test2	2026-07-19 17:43:26.462
\.


--
-- Data for Name: Board; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."Board" (id, title, "projectId") FROM stdin;
578ed278-8055-4cdd-966d-06054aad77a4	Kanban	30780b86-72e0-41bc-96ac-cf1ecbf8fe30
07af35a5-8d6c-4a28-bfde-6a87dd10b5d0	Kanban	30780b86-72e0-41bc-96ac-cf1ecbf8fe30
\.


--
-- Data for Name: Channel; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."Channel" (id, name, "teamId", notice) FROM stdin;
826732cf-a782-4207-afff-5eb02daeed16	dm:7fea67d4-58d2-4f71-9e98-1192b4baffad:b5d5b03f-ae5d-4df4-9458-34896aa6f596	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	\N
6c4ce105-430a-41b0-9a11-44c1bbab6e15	test_1	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	\N
8b39cdd0-2fef-4a36-bc11-88e629882820	test_2	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	\N
\.


--
-- Data for Name: Column; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."Column" (id, title, "order", "boardId", color, category) FROM stdin;
f29bb83e-1fbc-4c35-9c51-8d428d76bfbd	Backlog	0	07af35a5-8d6c-4a28-bfde-6a87dd10b5d0	gray	BACKLOG
bcf42862-98e7-478f-a86c-85f8070a9798	To do	1	07af35a5-8d6c-4a28-bfde-6a87dd10b5d0	blue	TODO
c57e3f1b-8f51-4682-a25f-6b32d383cc86	In progress	2	07af35a5-8d6c-4a28-bfde-6a87dd10b5d0	amber	IN_PROGRESS
e283bc53-089f-4c3e-98c6-f7487dcc0f6f	In review	3	07af35a5-8d6c-4a28-bfde-6a87dd10b5d0	purple	REVIEW
51ba3c0c-8dab-49cd-9eeb-9fc6b9f7fad2	Done	4	07af35a5-8d6c-4a28-bfde-6a87dd10b5d0	green	DONE
8de2887b-9050-4a30-b48a-ab7d7ee8024c	Backlog	0	578ed278-8055-4cdd-966d-06054aad77a4	gray	BACKLOG
764ae608-9116-452e-b0c9-b785b4593d32	To do	1	578ed278-8055-4cdd-966d-06054aad77a4	blue	TODO
2a9a4938-969d-47c1-943d-a57793d29acb	In progress	2	578ed278-8055-4cdd-966d-06054aad77a4	amber	IN_PROGRESS
b9bcbd75-5595-4807-99e1-7ca2205319ea	In review	3	578ed278-8055-4cdd-966d-06054aad77a4	purple	REVIEW
daf2c73e-7991-4b46-a436-b28b8145dc81	Done	4	578ed278-8055-4cdd-966d-06054aad77a4	green	DONE
\.


--
-- Data for Name: FeedbackSubmission; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."FeedbackSubmission" (id, "userId", type, content, "createdAt") FROM stdin;
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."Message" (id, content, "channelId", "authorId", "createdAt") FROM stdin;
01f67096-918e-4cbb-b870-b9494510be5f	Hello everyone	6c4ce105-430a-41b0-9a11-44c1bbab6e15	b5d5b03f-ae5d-4df4-9458-34896aa6f596	2026-07-19 00:04:15.968
624e1e82-3819-4bc8-9894-496e28fc9e16	hello	826732cf-a782-4207-afff-5eb02daeed16	b5d5b03f-ae5d-4df4-9458-34896aa6f596	2026-07-19 00:04:20.879
3d004f77-fde6-451a-af02-12f5e5cfdf82		826732cf-a782-4207-afff-5eb02daeed16	b5d5b03f-ae5d-4df4-9458-34896aa6f596	2026-07-19 00:04:52.622
3167bf8a-60a6-48a4-aa7d-1db0e2a9158b	Im ZRB fuck u	6c4ce105-430a-41b0-9a11-44c1bbab6e15	7fea67d4-58d2-4f71-9e98-1192b4baffad	2026-07-19 00:05:25.348
56d581a9-49b0-43a0-b19c-ae878d5a9edb	IM zrb and fuck me	826732cf-a782-4207-afff-5eb02daeed16	7fea67d4-58d2-4f71-9e98-1192b4baffad	2026-07-19 00:05:40.637
0ebfba0f-c000-4448-96de-9e7ec929ba3c	hello	826732cf-a782-4207-afff-5eb02daeed16	7fea67d4-58d2-4f71-9e98-1192b4baffad	2026-07-19 00:06:11.489
9e704760-737a-4339-a81a-50c4371cc5e1	hello	6c4ce105-430a-41b0-9a11-44c1bbab6e15	b5d5b03f-ae5d-4df4-9458-34896aa6f596	2026-07-19 17:41:23.306
334030d5-44cf-46ee-a2c9-8dbea3fa20e1	hi	6c4ce105-430a-41b0-9a11-44c1bbab6e15	7fea67d4-58d2-4f71-9e98-1192b4baffad	2026-07-19 17:42:08.144
261f8aea-0c1b-4fba-afa5-ce3b21ef23a1	hello	6c4ce105-430a-41b0-9a11-44c1bbab6e15	b5d5b03f-ae5d-4df4-9458-34896aa6f596	2026-07-19 17:44:45.327
505483ba-2ad0-40a7-bef7-336cbf0d64c7	hello	6c4ce105-430a-41b0-9a11-44c1bbab6e15	b5d5b03f-ae5d-4df4-9458-34896aa6f596	2026-07-19 17:44:46.44
\.


--
-- Data for Name: MessageAttachment; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."MessageAttachment" (id, "messageId", "originalName", "storedName", "mimeType", "sizeBytes", "storagePath", "createdAt") FROM stdin;
d605a642-960e-499d-9dfd-9de34e065205	3d004f77-fde6-451a-af02-12f5e5cfdf82	main.ipynb	b8f5780f-73ec-463b-93d4-3737282ffc12.ipynb	application/octet-stream	115949	b8f5780f-73ec-463b-93d4-3737282ffc12.ipynb	2026-07-19 00:04:52.619
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."Notification" (id, "recipientId", "actorId", "workspaceId", "projectId", "taskId", "messageId", type, "eventId", title, content, link, "isRead", "createdAt", "readAt") FROM stdin;
bc5fc6e0-86a6-41c0-8489-1f3f19874bdc	b5d5b03f-ae5d-4df4-9458-34896aa6f596	7fea67d4-58d2-4f71-9e98-1192b4baffad	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	\N	\N	334030d5-44cf-46ee-a2c9-8dbea3fa20e1	WORKSPACE_CHAT_MESSAGE	334030d5-44cf-46ee-a2c9-8dbea3fa20e1	New workspace chat message	zrb 在 TEST 的 Workspace Chat 中发送了新消息	/workspaces/8d97cc96-04ee-4cb2-8a45-34d0a943fd8f/chat?channelId=6c4ce105-430a-41b0-9a11-44c1bbab6e15	t	2026-07-19 17:42:08.163	2026-07-19 17:42:28.092
\.


--
-- Data for Name: NotificationPreference; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."NotificationPreference" ("userId", "notificationsEnabled", "kanbanNotificationsEnabled", "chatNotificationsEnabled", "createdAt", "updatedAt") FROM stdin;
7fea67d4-58d2-4f71-9e98-1192b4baffad	t	t	t	2026-07-19 17:44:30.75	2026-07-19 17:45:23.359
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."Project" (id, "workspaceId", name, key, description, "createdAt", "updatedAt", color) FROM stdin;
30780b86-72e0-41bc-96ac-cf1ecbf8fe30	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	TEST	WEB	TEST	2026-07-19 00:00:19.723	2026-07-19 00:00:19.723	#a855f7
\.


--
-- Data for Name: SafetyReport; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."SafetyReport" (id, "userId", category, description, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: Sprint; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."Sprint" (id, "projectId", name, goal, "startDate", "endDate", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Task; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."Task" (id, title, description, "order", "columnId", "assigneeId", "createdAt", code, priority, "dueDate", "storyPoints", "sprintId", "updatedAt") FROM stdin;
9b0486c8-2752-480f-8d49-185da703f585	test	test	0	8de2887b-9050-4a30-b48a-ab7d7ee8024c	7fea67d4-58d2-4f71-9e98-1192b4baffad	2026-07-19 17:42:43.571	WEB-1	MEDIUM	2026-07-31	\N	\N	2026-07-19 17:42:43.571
ab28773a-25b3-4cff-92c8-5e5853c14634	test2	test2	0	764ae608-9116-452e-b0c9-b785b4593d32	7fea67d4-58d2-4f71-9e98-1192b4baffad	2026-07-19 17:43:26.447	WEB-2	MEDIUM	2026-07-22	\N	\N	2026-07-19 17:43:26.447
\.


--
-- Data for Name: Team; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."Team" (id, name, slug, "createdAt", description, "ownerId", "updatedAt") FROM stdin;
8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	TEST	test	2026-07-18 23:59:34.95	TEST	b5d5b03f-ae5d-4df4-9458-34896aa6f596	2026-07-18 23:59:34.95
\.


--
-- Data for Name: TeamMember; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."TeamMember" (id, "userId", "teamId", "joinedAt", role) FROM stdin;
9284c5f7-37da-46a3-ab32-26f98fb77456	b5d5b03f-ae5d-4df4-9458-34896aa6f596	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	2026-07-18 23:59:34.95	OWNER
53b9eeed-0e2d-4cca-abe3-38741e094132	7fea67d4-58d2-4f71-9e98-1192b4baffad	8d97cc96-04ee-4cb2-8a45-34d0a943fd8f	2026-07-19 00:01:25.439	MEMBER
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."User" (id, email, name, "avatarUrl", "createdAt", "passwordHash", "updatedAt", provider, "providerId", "avatarColor") FROM stdin;
b5d5b03f-ae5d-4df4-9458-34896aa6f596	wenshuowenshuo886@gmail.com	wenshuo wang	https://lh3.googleusercontent.com/a/ACg8ocL1bCUpKcODPiMMG6U__oDXEgrvN41BXO24fhQtJwVGOrQEH7M=s96-c	2026-07-18 19:21:36.7	\N	2026-07-18 19:21:36.7	google	113447856029487453865	\N
7fea67d4-58d2-4f71-9e98-1192b4baffad	renbo@gmail.com	zrb	\N	2026-07-18 19:23:55.07	$2b$10$8tBHPaexI702yFcl.PiTTu9FYJ1ueNTEYx56ghvEC64CKFbMufdCK	2026-07-19 01:49:32.871	\N	\N	#0284c7
f3d41e5c-d7db-4d17-b269-394449982fa9	asdfghjkl123@fake-domain-xyz.com	test	\N	2026-07-19 19:01:00.516	$2b$10$wE19zeNXRBl4mxXpUgJC6eLAUKdl8plFQXZaHarLmiN8dTix.QiHm	2026-07-19 19:01:00.516	\N	\N	\N
\.


--
-- Data for Name: WikiDocument; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public."WikiDocument" (id, "workspaceId", "projectId", title, content, "createdById", "updatedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
e253a2df-0feb-4b24-a966-fba7f67c5c41	b7439784a4507efa406fc7347836af434a81dd8526eb4d19e80ecb63d78635cf	2026-07-18 19:18:22.737955+00	20260711001710_init	\N	\N	2026-07-18 19:18:22.677969+00	1
90be511b-e20b-4071-96cd-00617ecb34b8	eb7b8daec0ee36044749897ffa29c96c41df26fac64762d6285882b2cbf3c99d	2026-07-18 19:18:22.740934+00	20260711042004_add_user_password	\N	\N	2026-07-18 19:18:22.738568+00	1
897ec7f7-a705-444c-ade3-2c33ebce96fd	d21aef1cfd777477ccedfbfdce8a8c2c6ba8321b83e9f0866cf7d088db1a8ab8	2026-07-18 21:37:46.763017+00	20260718213746_add_feedback_and_safety_reports	\N	\N	2026-07-18 21:37:46.755844+00	1
e4638c41-62ab-4a8a-a945-daf7db505d18	0da0fcaff4f4c81dfdb5fa8c2f358c385cb24375288afbc14954f2948e2540da	2026-07-18 19:18:22.76477+00	20260711055050_workspace_foundation	\N	\N	2026-07-18 19:18:22.742442+00	1
fcbd4498-6ddc-4e22-b9dd-78c8ee5c4ec9	a6025c430f52dde7a9f16a79ff699aa432997b0046c200a6e20ad9fbfb515a7d	2026-07-18 19:18:22.768038+00	20260712000000_add_user_credentials	\N	\N	2026-07-18 19:18:22.765453+00	1
503a366e-96ab-484b-96c2-96e4599b99cb	dca8940add97f3bac8cb0da66c55c0e5e6ddecbf94466b455bc18eda744c46c4	2026-07-18 19:18:22.77014+00	20260712000001_drop_user_updated_at_default	\N	\N	2026-07-18 19:18:22.768667+00	1
ecc1612b-a2df-4808-ae71-fd222bc75621	35152261936aafee8c958b540cf8966c53999495184b8d37770097551ea82156	2026-07-18 23:29:41.574329+00	20260718232941_cascade_support_account_deletion	\N	\N	2026-07-18 23:29:41.569775+00	1
baf0dac7-aaf9-47b4-84d2-a47061b226a0	7f017a78f35dfe0dad796196a99498f8ea03e5fd51ddfc812055fc51b41a7d7e	2026-07-18 19:18:22.771894+00	20260713024652_after_login_feature_workspace_spaces_merged	\N	\N	2026-07-18 19:18:22.77061+00	1
fdbe6c1f-0ba4-4965-a53c-3df4b08dc71b	533f7590914a9287f291953dffe5e478bef8afe61d23ade5c0d2cb442f93f64b	2026-07-18 19:18:22.781339+00	20260714210000_add_projects_api_and_wiki_documents	\N	\N	2026-07-18 19:18:22.772314+00	1
d1ad7a0d-01af-4ccb-a5a1-d0f4f3e118c2	00fe98cc672f0c27d8fcf8296354bd6a6e619fa91bed09e453648b08ce4d6e7d	2026-07-18 19:18:22.78726+00	20260714233000_add_sprints	\N	\N	2026-07-18 19:18:22.781833+00	1
494ec035-d2ec-4446-8414-2350608a101d	ad7debdb274557b9b70cb746293518db7605f1aafd9936e87d69b031bb476465	2026-07-18 19:18:22.802584+00	20260716160000_complete_dashboard	\N	\N	2026-07-18 19:18:22.78772+00	1
2b47364f-c1e3-48f7-88ca-9b71ecc66ccc	e46d407b6c15cdfe7815a60aad32c55327bfd94fe36ed1a9a8a42f7720efe8ba	2026-07-18 19:18:22.804367+00	20260716223927_add_oauth_fields	\N	\N	2026-07-18 19:18:22.803007+00	1
0b898bc8-7f74-4459-974b-fb959b594859	b00c403068a1827e7c9bd152f8d949777d8d85b6bc3683c4ff6eae74e4915231	2026-07-18 19:18:22.806658+00	20260716235500_add_oauth_provider_identity_unique	\N	\N	2026-07-18 19:18:22.80486+00	1
a12872e0-131b-4133-8a74-cd8f573f0183	fdb7f1e67924525e7b44e479a8daaaab12ce31f4f90277984e2d42cfa38a20c0	2026-07-18 19:18:22.809204+00	20260717195238_add_avatar_color	\N	\N	2026-07-18 19:18:22.807229+00	1
b6fc21fc-c7d3-4ed0-bfd6-bf12352c2b1c	c0b8182c11fb53b7a41e66b694f15c23f9e3baed2bd013bdad1b44e01cebf5a1	2026-07-18 19:18:22.810958+00	20260718010221_drop_task_updated_at_default	\N	\N	2026-07-18 19:18:22.809737+00	1
\.


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: Board Board_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Board"
    ADD CONSTRAINT "Board_pkey" PRIMARY KEY (id);


--
-- Name: Channel Channel_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Channel"
    ADD CONSTRAINT "Channel_pkey" PRIMARY KEY (id);


--
-- Name: Column Column_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Column"
    ADD CONSTRAINT "Column_pkey" PRIMARY KEY (id);


--
-- Name: FeedbackSubmission FeedbackSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."FeedbackSubmission"
    ADD CONSTRAINT "FeedbackSubmission_pkey" PRIMARY KEY (id);


--
-- Name: MessageAttachment MessageAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."MessageAttachment"
    ADD CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: NotificationPreference NotificationPreference_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId");


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: SafetyReport SafetyReport_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."SafetyReport"
    ADD CONSTRAINT "SafetyReport_pkey" PRIMARY KEY (id);


--
-- Name: Sprint Sprint_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Sprint"
    ADD CONSTRAINT "Sprint_pkey" PRIMARY KEY (id);


--
-- Name: Task Task_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);


--
-- Name: TeamMember TeamMember_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."TeamMember"
    ADD CONSTRAINT "TeamMember_pkey" PRIMARY KEY (id);


--
-- Name: Team Team_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Team"
    ADD CONSTRAINT "Team_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WikiDocument WikiDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."WikiDocument"
    ADD CONSTRAINT "WikiDocument_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ActivityLog_actorId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "ActivityLog_actorId_idx" ON public."ActivityLog" USING btree ("actorId");


--
-- Name: ActivityLog_projectId_createdAt_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "ActivityLog_projectId_createdAt_idx" ON public."ActivityLog" USING btree ("projectId", "createdAt");


--
-- Name: ActivityLog_workspaceId_createdAt_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "ActivityLog_workspaceId_createdAt_idx" ON public."ActivityLog" USING btree ("workspaceId", "createdAt");


--
-- Name: Board_projectId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Board_projectId_idx" ON public."Board" USING btree ("projectId");


--
-- Name: Channel_teamId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Channel_teamId_idx" ON public."Channel" USING btree ("teamId");


--
-- Name: Channel_teamId_name_key; Type: INDEX; Schema: public; Owner: dev
--

CREATE UNIQUE INDEX "Channel_teamId_name_key" ON public."Channel" USING btree ("teamId", name);


--
-- Name: Column_boardId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Column_boardId_idx" ON public."Column" USING btree ("boardId");


--
-- Name: MessageAttachment_messageId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "MessageAttachment_messageId_idx" ON public."MessageAttachment" USING btree ("messageId");


--
-- Name: Message_authorId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Message_authorId_idx" ON public."Message" USING btree ("authorId");


--
-- Name: Message_channelId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Message_channelId_idx" ON public."Message" USING btree ("channelId");


--
-- Name: Notification_actorId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Notification_actorId_idx" ON public."Notification" USING btree ("actorId");


--
-- Name: Notification_createdAt_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Notification_createdAt_idx" ON public."Notification" USING btree ("createdAt");


--
-- Name: Notification_messageId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Notification_messageId_idx" ON public."Notification" USING btree ("messageId");


--
-- Name: Notification_projectId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Notification_projectId_idx" ON public."Notification" USING btree ("projectId");


--
-- Name: Notification_recipientId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Notification_recipientId_idx" ON public."Notification" USING btree ("recipientId");


--
-- Name: Notification_recipientId_isRead_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Notification_recipientId_isRead_idx" ON public."Notification" USING btree ("recipientId", "isRead");


--
-- Name: Notification_recipientId_type_eventId_key; Type: INDEX; Schema: public; Owner: dev
--

CREATE UNIQUE INDEX "Notification_recipientId_type_eventId_key" ON public."Notification" USING btree ("recipientId", type, "eventId");


--
-- Name: Notification_taskId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Notification_taskId_idx" ON public."Notification" USING btree ("taskId");


--
-- Name: Notification_workspaceId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Notification_workspaceId_idx" ON public."Notification" USING btree ("workspaceId");


--
-- Name: Project_workspaceId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Project_workspaceId_idx" ON public."Project" USING btree ("workspaceId");


--
-- Name: Project_workspaceId_key_key; Type: INDEX; Schema: public; Owner: dev
--

CREATE UNIQUE INDEX "Project_workspaceId_key_key" ON public."Project" USING btree ("workspaceId", key);


--
-- Name: Sprint_one_active_per_project_key; Type: INDEX; Schema: public; Owner: dev
--

CREATE UNIQUE INDEX "Sprint_one_active_per_project_key" ON public."Sprint" USING btree ("projectId") WHERE (status = 'ACTIVE'::public."SprintStatus");


--
-- Name: Sprint_projectId_createdAt_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Sprint_projectId_createdAt_idx" ON public."Sprint" USING btree ("projectId", "createdAt");


--
-- Name: Sprint_projectId_status_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Sprint_projectId_status_idx" ON public."Sprint" USING btree ("projectId", status);


--
-- Name: Task_assigneeId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Task_assigneeId_idx" ON public."Task" USING btree ("assigneeId");


--
-- Name: Task_columnId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Task_columnId_idx" ON public."Task" USING btree ("columnId");


--
-- Name: Task_dueDate_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Task_dueDate_idx" ON public."Task" USING btree ("dueDate");


--
-- Name: Task_sprintId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Task_sprintId_idx" ON public."Task" USING btree ("sprintId");


--
-- Name: TeamMember_teamId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "TeamMember_teamId_idx" ON public."TeamMember" USING btree ("teamId");


--
-- Name: TeamMember_teamId_role_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "TeamMember_teamId_role_idx" ON public."TeamMember" USING btree ("teamId", role);


--
-- Name: TeamMember_userId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "TeamMember_userId_idx" ON public."TeamMember" USING btree ("userId");


--
-- Name: TeamMember_userId_teamId_key; Type: INDEX; Schema: public; Owner: dev
--

CREATE UNIQUE INDEX "TeamMember_userId_teamId_key" ON public."TeamMember" USING btree ("userId", "teamId");


--
-- Name: Team_ownerId_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "Team_ownerId_idx" ON public."Team" USING btree ("ownerId");


--
-- Name: Team_slug_key; Type: INDEX; Schema: public; Owner: dev
--

CREATE UNIQUE INDEX "Team_slug_key" ON public."Team" USING btree (slug);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: dev
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_provider_providerId_key; Type: INDEX; Schema: public; Owner: dev
--

CREATE UNIQUE INDEX "User_provider_providerId_key" ON public."User" USING btree (provider, "providerId");


--
-- Name: WikiDocument_createdById_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "WikiDocument_createdById_idx" ON public."WikiDocument" USING btree ("createdById");


--
-- Name: WikiDocument_updatedById_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "WikiDocument_updatedById_idx" ON public."WikiDocument" USING btree ("updatedById");


--
-- Name: WikiDocument_workspaceId_projectId_updatedAt_idx; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "WikiDocument_workspaceId_projectId_updatedAt_idx" ON public."WikiDocument" USING btree ("workspaceId", "projectId", "updatedAt");


--
-- Name: ActivityLog ActivityLog_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ActivityLog ActivityLog_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ActivityLog ActivityLog_workspaceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Board Board_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Board"
    ADD CONSTRAINT "Board_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Channel Channel_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Channel"
    ADD CONSTRAINT "Channel_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Column Column_boardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Column"
    ADD CONSTRAINT "Column_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES public."Board"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FeedbackSubmission FeedbackSubmission_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."FeedbackSubmission"
    ADD CONSTRAINT "FeedbackSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MessageAttachment MessageAttachment_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."MessageAttachment"
    ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."Message"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Message Message_channelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public."Channel"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NotificationPreference NotificationPreference_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."Message"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_recipientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_workspaceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Project Project_workspaceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SafetyReport SafetyReport_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."SafetyReport"
    ADD CONSTRAINT "SafetyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sprint Sprint_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Sprint"
    ADD CONSTRAINT "Sprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_assigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_columnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES public."Column"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_sprintId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES public."Sprint"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TeamMember TeamMember_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."TeamMember"
    ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeamMember TeamMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."TeamMember"
    ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Team Team_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."Team"
    ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WikiDocument WikiDocument_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."WikiDocument"
    ADD CONSTRAINT "WikiDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WikiDocument WikiDocument_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."WikiDocument"
    ADD CONSTRAINT "WikiDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WikiDocument WikiDocument_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."WikiDocument"
    ADD CONSTRAINT "WikiDocument_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WikiDocument WikiDocument_workspaceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."WikiDocument"
    ADD CONSTRAINT "WikiDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: dev
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict KC1SmA1AdUJBf9NCAdZrwcVfdBjuQMj0retnPHr3CjcacDQJjl5L6qo8DnXG9A3


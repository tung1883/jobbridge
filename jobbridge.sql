--
-- PostgreSQL database dump
--

\restrict B6bCNMhqZfNL54dUd0d60T2Dfl8sdGMadTmYVc4HbtasNgQjWDuLelUzrm3IZIR

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: jobs_search_trigger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.jobs_search_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', NEW.title || ' ' || NEW.description);
  RETURN NEW;
END
$$;


ALTER FUNCTION public.jobs_search_trigger() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    user_id integer,
    cv_url text NOT NULL,
    status text DEFAULT 'submitted'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- Name: candidate_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidate_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer,
    full_name text,
    location text,
    summary text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.candidate_profiles OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer,
    name text,
    verification_status text DEFAULT 'pending'::text,
    description text,
    website text,
    logo_url text,
    location text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT companies_verification_status_check CHECK ((verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])))
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: company_verification_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_verification_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    document_type text,
    file_path text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.company_verification_documents OWNER TO postgres;

--
-- Name: cvs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cvs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer,
    file_name text,
    file_path text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cvs OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    responsibilities text[],
    required_qualifications text[],
    salary_min numeric,
    salary_max numeric,
    currency text,
    location text,
    job_type text,
    publishing_date timestamp without time zone,
    application_deadline timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    search_vector tsvector
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO postgres;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'job_seeker'::text NOT NULL,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['job_seeker'::text, 'recruiter'::text, 'admin'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.applications (id, job_id, user_id, cv_url, status, created_at, updated_at) FROM stdin;
02067d48-210c-477b-bdf9-eb5a64cf048e	da0055cf-b1dd-45a4-84aa-210da49f2526	4	uploads\\cvs\\1773770461064-74284888.pdf	submitted	2026-03-18 01:02:18.66338	2026-03-18 01:02:18.66338
\.


--
-- Data for Name: candidate_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidate_profiles (id, user_id, full_name, location, summary, created_at) FROM stdin;
c2f1e7f6-894b-41bf-acc2-3db2e4e8e261	4	\N	\N	\N	2026-03-17 09:42:21.839377
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, user_id, name, verification_status, description, website, logo_url, location, created_at) FROM stdin;
e84cfe56-bb1d-4abd-b768-b2d7adb6058f	8	Testing Company	pending	Small size company that mostly used for teseting	more_test.com	/uploads/logos/1773718343753-955408049.png	Hanoi, Vietnam	2026-03-17 10:09:27.535783
\.


--
-- Data for Name: company_verification_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_verification_documents (id, company_id, document_type, file_path, uploaded_at) FROM stdin;
2e2d4b0a-3daf-4cdf-90e8-95f7834cba32	e84cfe56-bb1d-4abd-b768-b2d7adb6058f	\N	/uploads/verification_docs/1773720890180-39946539.pdf	2026-03-17 11:14:50.240799
c3c2dcdb-224a-4931-9dae-09ee162b9173	e84cfe56-bb1d-4abd-b768-b2d7adb6058f	\N	/uploads/verification_docs/1773720908485-893590610.pdf	2026-03-17 11:15:08.524585
8c627ec7-1c3c-40c1-9ae4-26234d33bd31	e84cfe56-bb1d-4abd-b768-b2d7adb6058f	\N	/uploads/verification_docs/1773720908486-947428359.png	2026-03-17 11:15:08.528666
\.


--
-- Data for Name: cvs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cvs (id, user_id, file_name, file_path, uploaded_at) FROM stdin;
7edf77d8-746a-4f3f-a117-871b86e19009	4	resume_1.pdf	uploads\\cvs\\1773770429505-219950746.pdf	2026-03-18 01:00:29.550072
62c6c90c-4d7f-4e99-856f-7869b6d9bcad	4	resume_1.pdf	uploads\\cvs\\1773770461064-74284888.pdf	2026-03-18 01:01:01.113663
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, title, description, responsibilities, required_qualifications, salary_min, salary_max, currency, location, job_type, publishing_date, application_deadline, created_by, created_at, updated_at, search_vector) FROM stdin;
da0055cf-b1dd-45a4-84aa-210da49f2526	Backend Developer	We are looking for a backend developer to build scalable APIs.	{"Build REST APIs","Optimize database queries","Collaborate with frontend team"}	{"2+ years Node.js experience","Experience with PostgreSQL","Understanding of REST APIs"}	1000	2000	USD	Hanoi, Vietnam	FULL_TIME	2026-03-15 09:00:00	2026-04-01 23:59:59	8	2026-03-17 22:16:07.273009	2026-03-18 00:04:21.789438	'api':13 'backend':1,8 'build':11 'develop':2,9 'look':5 'scalabl':12
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token, expires_at, created_at) FROM stdin;
37	\N	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6bnVsbCwianRpIjoiOWYxNmFlZGYtZTQ2Yy00MmI2LTliYTgtMmUzYjlhMDJkNWM3IiwiaWF0IjoxNzczNjg5OTQxLCJleHAiOjE3NzQyOTQ3NDF9.4xRsSz16ODuLJveDsl-mwSartRxM9hwSwz8YPA9BH5s	2026-03-24 02:39:01.966085	2026-03-17 02:39:01.966085
38	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwianRpIjoiMjI3MzU1NDQtYzU0MC00ZjM2LTg3NTAtZTgzNjcxOTVhNjE3IiwiaWF0IjoxNzczNjkwMjUzLCJleHAiOjE3NzQyOTUwNTN9.UP2wNc4wEipzcVbPo8V9PK9fMRvKJW7VvV_1gxSZuXo	2026-03-24 02:44:13.865397	2026-03-17 02:44:13.865397
39	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwianRpIjoiMGYyNWE3ZDEtYzkzYy00ODljLTg1NWMtMWRiMTA5NTdlOTgyIiwiaWF0IjoxNzczNjkwMjU3LCJleHAiOjE3NzQyOTUwNTd9.3aINJ8KaCxwir5Rea53YIZ2eD8rreirDShFKf4mECRQ	2026-03-24 02:44:17.528222	2026-03-17 02:44:17.528222
40	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwianRpIjoiNzU0NmVkOGItNmE5MS00YThjLThiMjQtMjVhYzE5ODI3NTAyIiwiaWF0IjoxNzczNjkwMjU5LCJleHAiOjE3NzQyOTUwNTl9.f0HH4nGg7pLcbkCBL0h_M97IjQaW9c2xzeD3XQdvdiY	2026-03-24 02:44:19.61426	2026-03-17 02:44:19.61426
41	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwianRpIjoiNTAxNzU0YmQtMmQ2Zi00NWM0LWE5YmQtYTBjZTdjZTllM2ZlIiwiaWF0IjoxNzczNjkwMzQzLCJleHAiOjE3NzQyOTUxNDN9.9K0_wGKqCGcsKZ3fFO1LoZ0YBiSG_y33YWBE6-2wGRM	2026-03-24 02:45:43.783645	2026-03-17 02:45:43.783645
42	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwianRpIjoiMGI3YWM0ZWUtYTMyNy00MTBmLWIzOTEtZjEwZDU0MGQ2NTM3IiwiaWF0IjoxNzczNjkwNzc0LCJleHAiOjE3NzQyOTU1NzR9.bGeGTPnYSRGmau-X6QVWByZzElnI27qDIH1Ht9moYDg	2026-03-24 02:52:54.200252	2026-03-17 02:52:54.200252
43	2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwianRpIjoiZjlmZmMwMTctMWI2OS00MGY4LWI5NzUtMzIxNWZiNmQwZjFlIiwiaWF0IjoxNzczNjkxMTM2LCJleHAiOjE3NzQyOTU5MzZ9.vfZU2FE7VTFrw09deMXwAOTt4pDiGK3v0ucDfnJ-BhQ	2026-03-24 02:58:56.710202	2026-03-17 02:58:56.710202
44	2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwianRpIjoiMTJlOGMzOTgtYmE0NS00NmZkLThjZDUtOTczODgzMTVkMmQ1IiwiaWF0IjoxNzczNzEwNzA5LCJleHAiOjE3NzQzMTU1MDl9.TYPCjLwatZDYyJUXAboBixcQabpAxWU4iY_blTdusvA	2026-03-24 08:25:09.202707	2026-03-17 08:25:09.202707
45	2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwianRpIjoiMDQ5OWY1ODQtZDk1MC00MmM4LTgzZDYtNDFiYzRlMmE2NWM0IiwiaWF0IjoxNzczNzExNzU0LCJleHAiOjE3NzQzMTY1NTR9.BRf-1vnxC7OF6y0aUDLPWlZ1GVGyKLeMTwE3fiOFGuk	2026-03-24 08:42:34.377774	2026-03-17 08:42:34.377774
46	5	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwianRpIjoiMmIzZDQ2MTktYzk2Ni00MTNjLWE5MWItNjQ1ZTBiMDA5MmYzIiwiaWF0IjoxNzczNzE1NTgwLCJleHAiOjE3NzQzMjAzODB9.2dq-xA5noWcgAqI0E9yPvYs_FlsrcVdSuamhbnjha2A	2026-03-24 09:46:20.635824	2026-03-17 09:46:20.635824
47	5	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwianRpIjoiOThhNzFlOTYtMmVmNC00ODVmLWE4YzUtNDgzOGI3MDRlMWJkIiwiaWF0IjoxNzczNzE1ODY2LCJleHAiOjE3NzQzMjA2NjZ9.8s1aQ0UuHy7v8Yu8fdMccX5Xlsfecd8Ybugb6Nhchj4	2026-03-24 09:51:06.904587	2026-03-17 09:51:06.904587
48	6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwianRpIjoiOWJlYTA0OTctMjY4Ny00YjQ5LWE2YzktOThkYTM5MGExZjc5IiwiaWF0IjoxNzczNzE2MjI2LCJleHAiOjE3NzQzMjEwMjZ9.nAAUmNVfMNMjzr-2w8mb5QjpkQ5D0VhtAA7VY4_F7lY	2026-03-24 09:57:06.494832	2026-03-17 09:57:06.494832
49	8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwianRpIjoiYWU1ZWQ2YzctZGVhMi00YWVjLWFjYzUtZGNkMTY0MWZhOTdmIiwiaWF0IjoxNzczNzE3MTE2LCJleHAiOjE3NzQzMjE5MTZ9.-iOIwVmsj8K-3ReTyNaeWO_z42jfdNyCat65gVwi-ss	2026-03-24 10:11:56.764704	2026-03-17 10:11:56.764704
50	8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwianRpIjoiNDQzNjA1NTctZWRhNi00NzZhLTlhMWUtYjFkODJmM2NiYmRlIiwiaWF0IjoxNzczNzU5MjIxLCJleHAiOjE3NzQzNjQwMjF9.YqSS70TJWs-nC0JEzIIWNwHzvwfDjsr2OPWrLsKrLA8	2026-03-24 21:53:41.223558	2026-03-17 21:53:41.223558
51	4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwianRpIjoiODBiYTIzYzctNzViNS00ZTU0LThlYmMtNDhiOTRjZjk5YmYzIiwiaWF0IjoxNzczNzcwMjU2LCJleHAiOjE3NzQzNzUwNTZ9.d11V8BbyI7fiNN1Yuc_8OIy5KAKIzIbEtBnQF47Aoco	2026-03-25 00:57:36.724198	2026-03-18 00:57:36.724198
52	8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwianRpIjoiODNjYjMyZDktYjk4Yy00ZjI0LWE3ZGYtMjAxZDMwOTcyZDA2IiwiaWF0IjoxNzczNzcwNjM5LCJleHAiOjE3NzQzNzU0Mzl9.avMvmRL_f9M4F_zu-DfK-Ul-rgk_axYi56atyAd-EgY	2026-03-25 01:03:59.084307	2026-03-18 01:03:59.084307
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, role, is_verified, created_at) FROM stdin;
4	user@test.com	$2b$10$0SCIO4Ka8UNJkRKjZuiL7e9MJ0HZCCp5yea6uOJBELUGNgDKLCPuy	job_seeker	f	2026-03-17 09:42:21.836119
8	company@test.com	$2b$10$eXWtT1UgQTZidR.qOaKoeerHHqA0iQ45OyhXB.cUMgt7MfZ6OeCoO	recruiter	f	2026-03-17 10:09:27.533154
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 52, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: candidate_profiles candidate_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_pkey PRIMARY KEY (id);


--
-- Name: candidate_profiles candidate_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_user_id_key UNIQUE (user_id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_user_id_key UNIQUE (user_id);


--
-- Name: company_verification_documents company_verification_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_verification_documents
    ADD CONSTRAINT company_verification_documents_pkey PRIMARY KEY (id);


--
-- Name: cvs cvs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cvs
    ADD CONSTRAINT cvs_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_jobs_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_search ON public.jobs USING gin (search_vector);


--
-- Name: jobs tsvectorupdate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.jobs_search_trigger();


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: companies companies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: company_verification_documents company_verification_documents_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_verification_documents
    ADD CONSTRAINT company_verification_documents_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict B6bCNMhqZfNL54dUd0d60T2Dfl8sdGMadTmYVc4HbtasNgQjWDuLelUzrm3IZIR


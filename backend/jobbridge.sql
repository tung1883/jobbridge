--
-- PostgreSQL database dump
--

\restrict 4SNtiph57U8pppEMXnCdpYB2egc6jV4l3eqJ5kONWKa58sAkEYtxq6aXlqCAt8G

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
    description text,
    responsibilities text,
    required_qualifications text,
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
    created_at timestamp without time zone DEFAULT now(),
    revoked boolean DEFAULT false
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
ea9c4c82-b73f-4a97-8dd1-e230fbd9ac76	e680b6d9-719d-4a02-8c8b-acedd3aaf15d	581	uploads\\cvs\\1774153638357-265003708.pdf	submitted	2026-03-22 13:42:11.058489	2026-03-22 13:42:11.058489
\.


--
-- Data for Name: candidate_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidate_profiles (id, user_id, full_name, location, summary, created_at) FROM stdin;
5804f588-d656-41da-9ab3-cf50976fc3f8	581	Nguyen Duc Tung	Hanoi, Vietnam	Back-End Developer with long-time experience in Spring Boot	2026-03-22 11:26:11.418358
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, user_id, name, verification_status, description, website, logo_url, location, created_at) FROM stdin;
4aea2d59-af1e-452f-96e1-e3edf217e0ca	582	ACME Group	verified	Energetic culture combined with experience	\N	\N	\N	2026-03-22 11:28:16.504442
\.


--
-- Data for Name: company_verification_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_verification_documents (id, company_id, document_type, file_path, uploaded_at) FROM stdin;
\.


--
-- Data for Name: cvs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cvs (id, user_id, file_name, file_path, uploaded_at) FROM stdin;
7edf77d8-746a-4f3f-a117-871b86e19009	4	resume_1.pdf	uploads\\cvs\\1773770429505-219950746.pdf	2026-03-18 01:00:29.550072
62c6c90c-4d7f-4e99-856f-7869b6d9bcad	4	resume_1.pdf	uploads\\cvs\\1773770461064-74284888.pdf	2026-03-18 01:01:01.113663
b3ed15ff-619d-487c-9adf-36037a401109	17	resume_1.pdf	uploads\\cvs\\1773815495147-19417231.pdf	2026-03-18 13:31:35.181454
9367be74-4014-42aa-8018-20c7db44419d	16	resume_1.pdf	uploads\\cvs\\1773818228668-290523469.pdf	2026-03-18 14:17:08.707334
a77325f6-a407-4c7d-a1a7-7f37bf067495	19	resume_3.pdf	uploads\\cvs\\1773819621426-638282578.pdf	2026-03-18 14:40:21.431477
36f14a3f-ee46-45de-b4b0-dd7a6bf9bedb	581	resume_1.pdf	uploads\\cvs\\1774153638357-265003708.pdf	2026-03-22 11:27:18.40023
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, title, description, responsibilities, required_qualifications, salary_min, salary_max, currency, location, job_type, publishing_date, application_deadline, created_by, created_at, updated_at, search_vector) FROM stdin;
e680b6d9-719d-4a02-8c8b-acedd3aaf15d	Senior Product Designer	Description			0	\N	USD		Full-time	\N	\N	582	2026-03-22 12:55:39.447611	2026-03-22 12:55:39.447611	'descript':4 'design':3 'product':2 'senior':1
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token, expires_at, created_at, revoked) FROM stdin;
380	582	63a915cd8d12838ec704daa14f39018d747093bdb9e628ecd720de708754989c	2026-03-29 11:28:16.656547	2026-03-22 11:28:16.656547	t
379	581	083c11364115ea655156927d4d400567e151f3f2cf3c352624da0c35e842c9db	2026-03-29 11:26:11.589829	2026-03-22 11:26:11.589829	t
382	581	e83918cd23aa1cfea8955973755067cd7c491f0f89ff2fd85a106e3766a2121d	2026-03-29 13:07:18.768771	2026-03-22 13:07:18.768771	f
381	582	7240c02e31c46929a99c458da3ae1c30e924c28b83f87376f8d3db038047e090	2026-03-29 12:56:09.951684	2026-03-22 12:56:09.951684	t
383	581	d63fb2ab0773d8698089dc3c760a51372b5b6967e574d8a6db0230d68833752a	2026-03-29 15:06:56.677827	2026-03-22 15:06:56.677827	t
384	581	d1d37bd26761e572ea9702cd2fb1e00f76a94177c44a42a4100979ec8d8fb188	2026-03-29 15:10:39.065172	2026-03-22 15:10:39.065172	f
385	581	59f9b4fe42e364fcfa754f2cce25367ddf4405eea2a4a0664695069fc91378e7	2026-03-29 15:49:46.620458	2026-03-22 15:49:46.620458	t
386	581	57675186d2c3bedc5eb6565ada520049504af13c8b212f9cd462b89d2882152c	2026-03-29 16:02:15.379928	2026-03-22 16:02:15.379928	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, role, is_verified, created_at) FROM stdin;
581	seeker@gmail.com	$2b$10$3w/pgesXiXkKkwFijS6Y1OUL.OGs6Z6TPNPb901CiiMV0ERBKzJtu	job_seeker	f	2026-03-22 11:26:11.418358
582	recruiter@gmail.com	$2b$10$KfrH/h2jDhxeI30sh2vBGeSaBatQeTPVPxA8bxDDlWrpSL02.jE0K	recruiter	f	2026-03-22 11:28:16.504442
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 386, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 582, true);


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

\unrestrict 4SNtiph57U8pppEMXnCdpYB2egc6jV4l3eqJ5kONWKa58sAkEYtxq6aXlqCAt8G


Spiro BMS - Real-Time Battery Management System

**Final Year Project Report**

**Author:** [Your Full Name Here]  
**Student ID:** [Your Student ID]  
**University:** [Your University Name]  
**Department:** Computer Science / Electrical & Computer Engineering  
**Date:** June 2026

## Abstract

The Spiro Battery Management System (BMS) is a comprehensive real-time cloud-based platform for monitoring and managing electric vehicle battery fleets. Built with modern web technologies, it provides live telemetry, anomaly detection, cryptographic security, fleet mapping, and remote control capabilities. This project addresses key challenges in EV battery management in emerging markets.

## Table of Contents
- [1. Introduction](#1-introduction)
- [2. Literature Review](#2-literature-review)
- [3. System Architecture](#3-system-architecture)
- [4. Methodology](#4-methodology)
- [5. Implementation](#5-implementation)
- [6. Testing and Evaluation](#6-testing-and-evaluation)
- [7. Challenges and Solutions](#7-challenges-and-solutions)
- [8. Conclusion and Future Work](#8-conclusion-and-future-work)
- [References](#references)
- [Appendices](#appendices)

## 1. Introduction

### 1.1 Background
Electric two-wheelers and battery swapping systems are growing rapidly. Effective real-time monitoring is essential for safety, asset protection, and operational efficiency.

### 1.2 Objectives
- Develop a scalable real-time telemetry system
- Create an intuitive web-based operator console
- Implement AI-driven anomaly detection
- Ensure end-to-end security using cryptography

## 2. Literature Review

Modern BMS systems utilize IoT protocols (MQTT), cloud databases (Supabase), and reactive frontends (React). Anomaly detection often employs ensemble models for risk scoring.

## 3. System Architecture

The system follows a three-tier architecture as shown in the workflow diagram:

- **Input Layer**: Hardware (batteries, chargers) → MQTT/4G → Edge Gateway
- **Processing Layer**: Real-time analytics, Supabase persistence
- **Presentation Layer**: React Dashboard with live updates

**Figure 1: Complete Operational Workflow** (Insert your image here)

## 4. Methodology

Agile development methodology was used with iterative prototyping. Technologies were selected for performance, developer experience, and cost-effectiveness in production environments.

## 5. Implementation

### Key Features
- Live Cell Matrix visualization
- Fleet map with 600+ assets
- Cryptographic handshake panels
- Event logging (merged live + DB)
- Tabbed interface (Dashboard, Live Fleet, Anomalies, etc.)

**Main Route Code Snippet** (from `/_authenticated/index.tsx`):

```tsx
// ... (your latest clean code here)
```

## 6. Testing and Evaluation

- Real-time performance tested at 800ms cadence
- UI responsiveness and cross-browser compatibility
- Security testing for authentication and RLS

## 7. Challenges and Solutions

- High-frequency data → SSE + memoization
- State management → React hooks + Supabase realtime

## 8. Conclusion and Future Work

The project successfully delivers a functional enterprise-grade BMS. Future enhancements include mobile app, predictive analytics, and hardware integration.

## References
1. Supabase Documentation, 2025.
2. MQTT Specification.
3. React Best Practices.

## Appendices
- Full Source Code
- Database Schema
- Screenshots of Dashboard and Live Fleet
- Workflow Diagram (image.png)

---

**To convert this to .docx:**

1. Copy the content above into a file.
2. Use Microsoft Word or online converter (Markdown to DOCX).
3. Insert your workflow image and screenshots.
4. Format headings and add page numbers.
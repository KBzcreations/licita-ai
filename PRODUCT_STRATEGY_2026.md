# LICITA — Product strategy 2026

## Executive decision

Rebuild Licita as a **demand network for agentic commerce**.

The user states a buying intent in natural language. Licita converts it into a structured, shareable request. Compatible buyers can join the same request. Merchants and commerce agents can then compete on price, delivery, warranty and terms.

Core promise:

> Stop searching. Make the market answer.

This is not a claim that a global marketplace already exists. The first release is an instrumented demand test with a useful output for the first user: a clean purchase brief and a shareable public request.

## Why this direction

### Market transition

- Google introduced the Universal Commerce Protocol for agentic commerce and is integrating it into Search and Gemini shopping experiences.
- Mastercard and Visa are building identity, intent, control and payment infrastructure for agent-initiated commerce.
- Research on agentic recommendation markets describes the same structural change: the user states a need before choosing a platform, and platforms compete for attention.

The opportunity is not to build another catalogue. It is to own a neutral, structured layer of **buyer intent** that existing catalogues and future agents can answer.

### Alternatives rejected

| Direction | Why it was rejected |
| --- | --- |
| Generic scam checker | Real global pain, but free products from Google, WhatsApp and Bitdefender can absorb the feature. |
| Life-admin document assistant | Valuable, but trust, sensitive data and platform-level assistants make distribution and retention difficult for a small entrant. |
| Supplier invoice discrepancy checker | Clear willingness to pay, but it is a focused B2B tool rather than a credible path to a global consumer network. |
| Conventional reverse marketplace | Many small implementations exist. They start empty and provide no value until both sides are present. |
| Cross-market resale autopilot | Strong integrations and marketplace policy access are required before the product produces value. |

## Product distinction

Licita is not merely “buyers post, sellers answer”. It adds three layers:

1. **Intent compiler:** turns an imprecise request into structured constraints that people and agents can compare.
2. **Demand pooling:** detects compatible requests and creates collective purchasing power.
3. **Agent-ready demand:** exposes a neutral request that merchant catalogues and agents can answer through APIs and emerging commerce protocols.

The cold-start answer is staged:

- Stage 1: a useful brief and share page for one person.
- Stage 2: similar buyers join; no sellers are required yet.
- Stage 3: existing retailers answer concentrated demand.
- Stage 4: commerce agents respond programmatically.

## Initial wedge

Start with **high-consideration, standardised products** in Spain:

- laptops and computers;
- televisions and appliances;
- mobile devices;
- small-team SaaS licences.

These categories are easier to compare than bespoke services, have enough purchase value to motivate sharing, and do not require Licita to manage physical delivery.

Do not launch travel, insurance, lending, healthcare, weapons, property or other regulated/high-risk categories in the first phase.

## Business model

Buyers remain free.

Revenue should be aligned with a completed outcome:

1. Affiliate commission on an existing retailer checkout.
2. Success fee or verified-sale fee from a merchant.
3. Merchant subscription for demand alerts, catalogue matching and response automation.
4. Later: anonymised market intelligence only at aggregate level, never the sale of identifiable user profiles.

No paid consumer subscription is assumed in the initial model.

## Growth loops

- Each request creates a shareable page: “Join my request to improve the offer.”
- Public, privacy-safe request pages target long-tail search demand.
- Creators and communities can form buying circles around an exact product.
- Merchants can embed “Open a group request” on out-of-stock or price-sensitive pages.
- An API/MCP surface can let assistants create and query Licita requests.

## Defensibility

The HTML interface is not the moat. Potential defensibility comes from:

- a graph of structured purchase intent;
- observed conversion between constraints, offers and completed purchases;
- buyer pooling and sharing density;
- merchant response and reliability history;
- trust and comparison rules that remain independent of seller advertising.

## First validation window

Duration: 30 days after release.

Minimum evidence to continue:

- at least 15% of qualified visitors create a request;
- at least 25% of created requests are shared;
- at least 10 joins come from sessions different from the request creator;
- one category produces at least 10 compatible requests;
- at least three legitimate merchants agree to review demand in that category.

Kill or radically narrow the idea if fewer than 20 legitimate requests are created from the first 500 qualified visitors, or if users create requests but do not share or join them.

## Product roadmap

### Release 0 — now

- Natural-language request creation.
- Deterministic fallback if the AI service is unavailable.
- Public demand board.
- Shareable request links.
- “I want something similar” joins.
- Real analytics events.
- No fake users or offers.

### Release 1 — after demand evidence

- Accounts and private contact details.
- Similarity matching between requests.
- Expiry dates and request status.
- Email updates and request management.
- A focused category taxonomy.

### Release 2 — after category concentration

- Verified merchant onboarding.
- Offer schema covering price, delivery, warranty and stock.
- Moderation and fraud controls.
- Affiliate checkout or success-fee tracking.

### Release 3 — after transactions

- Merchant catalogue API.
- UCP-compatible product/checkout paths where available.
- Licita MCP server for external assistants.
- Internationalisation based on measured demand, not translation alone.

## Hard truths

- Reaching millions cannot be promised and is statistically unlikely.
- A two-sided marketplace will require merchant acquisition and trust operations; software alone does not remove that work.
- The domain is useful for the concept, but the hyphen and Spanish word may eventually justify a shorter international brand if traction appears.
- The project should not take payments until merchant verification, refunds, disputes, tax and consumer-law responsibilities are designed properly.

## Evidence consulted

- Google Developers Blog, “Under the Hood: Universal Commerce Protocol (UCP)”.
- Mastercard, Agent Pay and Trust for agentic commerce.
- Visa, Intelligent Commerce and Trusted Agent Protocol.
- McKinsey, “The agentic commerce opportunity”.
- arXiv 2607.25253, “The User Asks, Platforms Compete”.
- Existing reverse-marketplace and group-buying products reviewed for cold-start and differentiation.

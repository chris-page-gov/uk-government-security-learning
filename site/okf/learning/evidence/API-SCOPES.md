---
type: Selected public evidence
title: Control access to your API
description: source-quotation. Retained public source lines L00137–L00142
status: draft
generated:
  by: process:public-security-learning/1
  at: '2026-10-31T23:49:00Z'
---

# Control access to your API

Evidence kind: **source-quotation**.

As well as authenticating your users, you should define resource-level access controls for your API, and check the authorisation for every request. When using OAuth 2.0 this means: a user must first request the scope of access they need to your API – for example, an order-read or order-write scope on each call to your API you should check that the user has the required scope before granting them access Defining scopes in this way allows for fine-grained access control to the endpoints of your API, and means you can include the authorisation information in your OAS specification . This makes it easier for consumers to use your API securely. Authentication and authorisation are features that can be defined and controlled through an API management system. Find out more about how to manage operations with an API gateway .

Source: [API technical and data standards](https://www.gov.uk/guidance/gds-api-technical-and-data-standards). Publisher: Government Digital Service. Edition: Public source observed 2026-10-28T10:49:05Z. Locator: Retained public source lines L00137–L00142.

Text SHA-256: 1dc28eb73b463982d665930317bd36da5572f881ccffc604ee48af92f49ffca0. Rights: Selected Crown text under OGL v3.0; source exceptions apply; no logos or third-party material selected.


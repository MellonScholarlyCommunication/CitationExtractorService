# Citation Extractor Service

The Citation Extractor Service (CES) is a Service Node in a [Value-Adding Network](https://www.eventnotifications.net).

CES watches an LDN Inbox for `as:Offer` notification messages about new published PDF documents. For each PDF document an citation extraction process is executed. The 
results of this citation extraction process is sent back to the requestor of the offer.

## Architecture

<img src="documentation/ces_architecture.png">

CES is composed out of the following components:

- **LDN Inbox** - The LDN inbox endpoint from which CES receives incoming notifications about new publications
- **Koreografeye** - The [koreografeye](https://github.com/eyereasoner/Koreografeye) reasoning engine
- **Citation processors** - Software to fetch PDF files and extract citation/mentions
- **N3 rules** - Rules that define what to process and how to respond

## Dependencies

- Node v16.18.1
- OAI-Bridge - https://github.com/MellonScholarlyCommunication/OAI-Bridge

## Installation

```
yarn install
yarn build
```

## Example as:Offer

```(json)
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "urn:uuid:775adc40-3cdf-4a84-827a-b74ca4485800",
  "type": [
    "Offer",
    "http://example.org/CitationExtraction"
  ],
  "actor": {
    "id": "https://biblio.ugent.be/profile/card#me",
    "type": "Service",
    "inbox": "http://n062-07.wall2.ilabt.iminds.be:3000/inbox/",
    "name": "Ghent University Academic Bibliography"
  },
  "object": {
    "id": "https://biblio.ugent.be/publication/8655843/file/8655844.pdf",
    "type": [
      "Article",
      "https://schema.org/ScholarlyArticle"
    ]
  },
  "origin": {
    "id": "https://github.com/MellonScholarlyCommunication/OAI-Bridge/profile/card#me",
    "type": "Service",
    "name": "OAI-Bridge Demo Service"
  },
  "target": {
    "id": "http://n062-07.wall2.ilabt.iminds.be:3001/profile/card#me",
    "type": "Service",
    "inbox": "http://n062-07.wall2.ilabt.iminds.be:3001/inbox/",
    "name": "Citation Extraction Service"
  }
}
```

## Configuration

### config.jsonld

Definition of all orchestration and policy execution plugins that will be used.

- `urn:koreografeye:reasonerInstance` - Definition of the N3 reasoner component
- `http://example.org/sendNotification` - Definition of the LDN sender component
- `http://example.org/extractCitations` - Definition of the PDF citation extraction component
- `http://example.org/serializeAs` - Definition of the N3 store serialization component

### rules/extractCitations.n3

An N3 rule file that requests:
 
- for each PDF file that is found in `as:object/as:url` the extraction of citations and mentions 
- the discovery of the LDN inbox for each of these citations
- the generation of a new input file for reasoning

## rules/biblio/announceCitations.n3

An N3 rule file that:

- send the parsed citations as a service result to the requesting data node

## Demonstration

### 1. Start a Solid CSS server

By starting the CES Solid CSS server, we create an LDN endpoint on port 3000 on localhost.

Open a new terminal and type:

```
yarn solid
```

### 2. Send some OAI-Bridge notifications to the Solid CSS server

OAI-Brige is a project as a bridge between the OAI-PMH protocol and the [Event Notifications in Value-Adding Network](https://www.eventnotifications.net) protocol.

In our examples data from https://biblio.ugent.be (Biblio) will be used.

```
yarn bridge:demo
```

After this step we can find on the Solid server http://localhost:3000/inbox/ some incoming 
`as:Announce` notifications about PDF resources published at in the Biblio repository.

### 3. Process the Solid LDN Inbox and decide what to do with the notifications

In the next step CES will read the LDN Inbox of the Solid instance and for each incoming
`as:Announce` the N3 rules in `rules/extractCitations` will define what the next processing
steps will be for each notification message. The results will be written to the `pre/` directory.

```
yarn extract:prepare
```

The `pre/` directory will now contain for each `as:Announce` notification the required
processing steps. These processing steps "policies" will be executed in the next step

### 4. Execute all policy steps requested in step 3.

In this processing step CES will do the actual PDF extraction of citations and generate a
new output file in the `in` directory for each processed notification.

```
yarn extract:run
```

### 5. Process the citations and decide what to do with them

In this procesing step CES will use N3 rules in `biblio/sendCitationNotifications.n3` to 
decide what to do with the citations found in the previous step.

```
yarn send:prepare
```

The results of this step will be in the `out` directory.

### 6. Execute the final sending of citations to the (external) LDN inboxes

In the processing step the results of the `out` directory will be executed by the 
policy executer. In our demo the citations will be sent back to the requestor
of the as:Offer.

```
yarn send:run
```
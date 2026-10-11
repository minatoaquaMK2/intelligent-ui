import { useMemo, useState, type ReactNode } from "react";
import { archetypes, defineScene } from "../diagram-kit";
import { ExplainerPage, type Chapter } from "./ExplainerPage";
import { buildIndex, match, snapshots, tokenize } from "./search";

function LabFrame({
  artifact,
  children,
}: {
  artifact: unknown;
  children: ReactNode;
}) {
  return (
    <div className="gx-example-grid">
      <div className="gx-example-artifact">
        <p>ACTUAL INPUTS & OUTPUTS</p>
        <pre>{JSON.stringify(artifact, null, 2)}</pre>
      </div>
      <div className="gx-example-output">{children}</div>
    </div>
  );
}
function IndexLab() {
  const [source, setSource] = useState(
    snapshots[0].map((d) => d.title).join("\n"),
  );
  const documents = useMemo(
    () =>
      source
        .split("\n")
        .filter((line) => line.trim())
        .map((title, i) => ({ id: i + 1, title })),
    [source],
  );
  const index = useMemo(() => buildIndex(documents), [documents]);
  return (
    <LabFrame artifact={{ documents, index }}>
      <label>
        One document per line
        <textarea value={source} onChange={(e) => setSource(e.target.value)} />
      </label>
      <p>
        {documents.length} documents → {Object.keys(index).length} distinct
        terms
      </p>
      <ul>
        {Object.entries(index).map(([term, ids]) => (
          <li key={term}>
            <strong>{term}</strong> → documents {ids.join(", ")}
          </li>
        ))}
      </ul>
    </LabFrame>
  );
}
function QueryLab() {
  const [query, setQuery] = useState("retry");
  const index = useMemo(() => buildIndex(snapshots[0]), []);
  const ids = match(index, query);
  return (
    <LabFrame artifact={{ query, terms: tokenize(query), matchingIds: ids }}>
      <label>
        Search terms
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ul>
        {snapshots[0]
          .filter((d) => ids.includes(d.id))
          .map((d) => (
            <li key={d.id}>{d.title}</li>
          ))}
      </ul>
      <p>
        {ids.length
          ? `${ids.length} matching documents`
          : "No matching documents"}
      </p>
      <p>
        The index stays fixed while the query changes. Try “retry jobs”,
        “deploy” and “unknown”.
      </p>
    </LabFrame>
  );
}
function SnapshotLab() {
  const [snapshot, setSnapshot] = useState(0);
  const [query, setQuery] = useState("retry");
  const documents = snapshots[snapshot];
  const index = useMemo(() => buildIndex(documents), [documents]);
  const ids = match(index, query);
  return (
    <LabFrame
      artifact={{
        snapshot: snapshot === 0 ? "A" : "B",
        query,
        index,
        matchingIds: ids,
      }}
    >
      <label>
        Document snapshot
        <select
          value={snapshot}
          onChange={(e) => setSnapshot(Number(e.target.value))}
        >
          <option value={0}>A · 3 documents</option>
          <option value={1}>B · 4 documents</option>
        </select>
      </label>
      <label>
        Search terms
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ul>
        {documents
          .filter((d) => ids.includes(d.id))
          .map((d) => (
            <li key={d.id}>{d.title}</li>
          ))}
      </ul>
      <p>
        {ids.length} results. The query stays unchanged when you replace the
        data.
      </p>
    </LabFrame>
  );
}

const chapters: Chapter[] = [
  {
    id: "indexing",
    short: "Build an index",
    question: "How does text become something we can search?",
    introduction:
      "The browser turns document text into normalized terms, then records which documents contain each term. Inspect the intermediate representation instead of treating search as a black box.",
    scene: defineScene(archetypes.pipeline, {
      id: "indexing",
      title: "Documents → inverted index",
      summary:
        "Document titles become terms and posting lists. Document IDs connect the index to its original input.",
      nodes: {
        model: {
          name: "Document input",
          role: "Titles with stable IDs",
          detail:
            "Each nonempty line in this small experiment becomes a document. Its ID is the position in the current list.",
          facts: [
            "Edit a line to change the input.",
            "These documents are local example data.",
          ],
          code: "documents = lines.map((title, i) => ({ id: i + 1, title }))",
        },
        compiler: {
          name: "Normalize terms",
          role: "Lowercase, split, deduplicate",
          detail:
            "The tokenizer recognizes ASCII letters and digits, lowercases them, and includes each term once per document.",
          facts: [
            "Repeated words do not duplicate a document ID.",
            "This example does not implement language-aware segmentation.",
          ],
          code: "[...new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? [])]",
        },
        runtime: {
          name: "Build posting lists",
          role: "Term → document IDs",
          detail:
            "For every term in each title, append the document ID to the term’s list.",
          facts: [
            "The operation runs on actual input.",
            "A changed input rebuilds this tiny index.",
          ],
          code: "(index[token] ??= []).push(document.id)",
        },
        host: {
          name: "Inspectable index",
          role: "A queryable representation",
          detail:
            "The experiment renders the real index object and its term count. A later query can read posting lists without rescanning titles.",
          facts: [
            "Inspect the JSON and term lists below.",
            "This is an in-memory teaching example.",
          ],
          code: "Object.entries(index)",
        },
        catalog: {
          name: "Document identity",
          role: "Connect terms to originals",
          detail:
            "Posting lists keep IDs instead of copying full titles into every term. IDs resolve back to the same document list.",
          facts: [
            "IDs in the example are local to the current input.",
            "Production identity schemes may differ.",
          ],
          code: "type Document = { id: number; title: string }",
        },
      },
      edgeLabels: {
        dsl: "Titles",
        ir: "Terms",
        operations: "Index",
        catalog: "IDs",
      },
    }),
    experiment: {
      title: "Inspect the index you just built",
      instruction:
        "Add “Retry network jobs” on a new line, then repeat the word “retry” in that line. Compare the actual posting list with the input documents.",
      takeaway:
        "The index stores the relationship between a term and the documents containing it.",
      scope:
        "This starter uses local example text and a small tokenizer. Replace the data and functions with your project’s real mechanism.",
    },
    renderLab: () => <IndexLab />,
  },
  {
    id: "querying",
    short: "Match a query",
    question: "What changes when the user types?",
    introduction:
      "A query follows a local feedback loop: input updates state, matching reads the fixed index, and the result list changes. Adding a term narrows an AND query.",
    scene: defineScene(archetypes.loop, {
      id: "querying",
      title: "The query feedback loop",
      summary:
        "Input → query state → term intersection → results. The index stays fixed throughout this chapter.",
      nodes: {
        input: {
          name: "Query input",
          role: "A user changes the text",
          detail:
            "Typing sends the new string to the React state setter. A diagram click only changes the explanation.",
          facts: [
            "Operate the actual input below.",
            "Graph selection is not a search event.",
          ],
          code: "onChange={e => setQuery(e.target.value)}",
        },
        state: {
          name: "Query state",
          role: "Current input value",
          detail:
            "The current query string is the input to matching. It remains in the browser.",
          facts: [
            "No server is involved in this example.",
            "No persistence is implied across reloads.",
          ],
          code: "const [query, setQuery] = useState('retry')",
        },
        diff: {
          name: "Intersect matches",
          role: "Every term must occur",
          detail:
            "Start from the first term’s posting list, then retain only IDs present in every other list.",
          facts: [
            "“retry jobs” matches both terms.",
            "An unknown term returns no results.",
          ],
          code: "firstIds.filter(id => terms.every(term => index[term]?.includes(id)))",
        },
        render: {
          name: "Matching documents",
          role: "Render the current result",
          detail:
            "Resolve matching IDs to the original document titles and display them. The user can refine the query again.",
          facts: [
            "The displayed IDs come from the actual matching function.",
            "The fixed index is reused.",
          ],
          code: "documents.filter(d => ids.includes(d.id))",
        },
      },
      edgeLabels: {
        event: "New query",
        evaluate: "Terms",
        ops: "Matches",
        "next-input": "Refine",
      },
      zoneLabels: { host: "INPUT & OUTPUT", worker: "STATE & MATCHING" },
    }),
    experiment: {
      title: "Narrow the result with a second term",
      instruction:
        "Compare “retry”, “retry deploy”, and “unknown”. Check the query tokens and matching IDs against the visible results.",
      takeaway:
        "The same index supports different queries; the result is derived from the current input.",
      scope:
        "This demonstrates exact term matching, not ranking, fuzzy search, or relevance quality.",
    },
    renderLab: () => <QueryLab />,
  },
  {
    id: "snapshots",
    short: "Replace the data",
    question: "Can data change without losing the query?",
    introduction:
      "The query and document snapshot are independent inputs. Rebuild the index from a new snapshot, then apply the unchanged query to show the resulting matches.",
    scene: defineScene(archetypes.convergence, {
      id: "snapshots",
      title: "Two inputs, one result",
      summary:
        "A retained query and a replaceable document snapshot converge in the same matching function.",
      nodes: {
        reference: {
          name: "Retained query",
          role: "Independent user state",
          detail:
            "Changing the snapshot does not call setQuery. The current input remains the rule used for matching.",
          facts: [
            "Choose a query before switching data.",
            "The query remains visible.",
          ],
          code: "const [query, setQuery] = useState(...)",
        },
        snapshot: {
          name: "Document snapshot",
          role: "Replaceable local data",
          detail:
            "Snapshot B adds a fourth document, “Retry network requests”, to the three documents in snapshot A.",
          facts: [
            "Snapshots are explicit example inputs.",
            "No live data source is claimed.",
          ],
          code: "documents = snapshots[snapshot]",
        },
        binding: {
          name: "Index and match",
          role: "Recompute from both inputs",
          detail:
            "Rebuild the small index when documents change, then match the current query. This example rebuilds fully, rather than updating an index incrementally.",
          facts: [
            "Same algorithm, different documents.",
            "The query is a separate input.",
          ],
          code: "ids = match(buildIndex(documents), query)",
        },
        value: {
          name: "Updated results",
          role: "Reflect the new data",
          detail:
            "The visible matching list may gain a document while the query text stays unchanged.",
          facts: [
            "A “retry” query gains one result in B.",
            "A “deploy” query keeps the same matches.",
          ],
          code: "documents.filter(d => ids.includes(d.id))",
        },
      },
      edgeLabels: {
        reference: "Query",
        "app-data": "Documents",
        "bound-value": "Results",
      },
    }),
    experiment: {
      title: "Keep the query, replace the snapshot",
      instruction:
        "Start with “retry” and switch A → B. Then use “deploy” and repeat. Compare which outputs change and which stay the same.",
      takeaway:
        "Independent inputs make state retention and data replacement observable.",
      scope:
        "This verifies the local example functions. Use actual project adapters before making claims about backend data updates.",
    },
    renderLab: () => <SnapshotLab />,
  },
];

export function ExamplePage() {
  return (
    <ExplainerPage
      project={{
        name: "Local Search Lab",
        question: "How does a sentence become a searchable result?",
        introduction:
          "Build an index, follow a query, and replace a dataset. Learn the mechanism by changing actual inputs and inspecting the resulting structures.",
        note: "Three small experiments. One visible chain of cause and effect.",
      }}
      chapters={chapters}
      implementation={{
        description:
          "The starter runs buildIndex, tokenize, and match from page-shell/search.ts in the browser. The graph is a teaching diagram; its animated arrows are not a live event trace. Adapt the chapters and experiments to the implementation being presented.",
      }}
    />
  );
}

# EchoSphere assignment verification

Verified on 14 October 2026: 64 Jest tests pass, 22 live Postman requests pass all 33 assertions, frontend TypeScript/lint/build pass, and both Docker images build. Mutation testing covers `backend/validation.js`: 227 killed and 19 survived out of 246 mutations, score 92.28%.

## Run the repeatable tests

Start Docker Desktop. The tests connect to a separate database on port 27018 and use `artifacts/jest-uploads` for temporary files. Never point this suite at your normal database or upload folder.

```powershell
docker start echosphere-assignment-mongo
cd backend
npm test
npm run test:mutation
```

If the assignment MongoDB container has not been created:

```powershell
docker run -d --name echosphere-assignment-mongo -p 127.0.0.1:27018:27017 mongo:8
```

The Jest integration suite exercises a real MongoDB database and stubs AI indexing/generation. The separate Postman collection exercises real Ollama generation and RAG retrieval.

## Run the assignment backend with disposable data

From `backend`, with MongoDB on port 27018 and Ollama running:

```powershell
$env:MONGODB_URI='mongodb://127.0.0.1:27018/echosphere_assignment'
$env:UPLOAD_DIR=[System.IO.Path]::GetFullPath('../artifacts/live-uploads')
$env:LANCE_DB_PATH=[System.IO.Path]::GetFullPath('../artifacts/live-vectors')
npm start
```

In a separate terminal, from `frontend`, run `npm run dev`. This session used port 5174 because another Vite process already held 5173.

Import `artifacts/EchoSphere.postman_collection.json` into Postman. Select Desktop Agent when using Postman web; Cloud Agent cannot reach localhost. Run the collection in order so the folder/note IDs are created before later requests. The collection creates disposable notes and prompts; it does not clear the knowledge base.

## Evidence

The eight-page Word document contains the real Postman health screenshot, a screenshot of the saved live CLI results, Jest execution results, the native Stryker HTML report, build/Git results, and verified application functionality. The raw CLI log and Jest JSON results are retained under `artifacts`. The PDF is the Word-rendered copy used for layout verification.

## Limits and handover

- Mutation coverage is limited to request validation; 19 mutations survive.
- The frontend Performance Prediction card is an unimplemented placeholder in the supplied project; it has no route or backend. It is not included among verified features.
- AI tests check response shape and non-empty content. They do not establish factual accuracy for arbitrary documents.
- npm reports dependency vulnerabilities, including in testing dependencies; a dependency/security upgrade is separate work.
- The first clear-all test used the normal local upload folder. This was corrected to a separate test upload directory. Original database inspection found no uploaded-file records; if you previously had local files, check backups or re-upload them.
- Changes remain uncommitted on the existing branch.

The consolidated report is now saved as `artifacts/24BRS1382_DA3.docx` and `artifacts/24BRS1382_DA3.pdf`, in A4 portrait format. It includes KAILASH P / 24BRS1382, the testing evidence, requirements, SRS, DFD, ERD, UML and links carried forward from DA1/DA2. `artifacts/24BRS1382_DA3_Report_Package.zip` includes both DA3 formats, the previous reports and the Postman collection.

Manual assignment work: review the report against your college format, check that the linked Figma/Drive resources are accessible to the examiner, commit and push the local changes if the submitted GitHub link must show the tested code, prepare and deliver the live demo, and submit the required PDF(s) through the college portal. Back up the report package; nothing needs to be saved in chat for the files to exist on your computer.

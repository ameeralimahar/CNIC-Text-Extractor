const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');
const { formatDate, formatDateOnly, calcAge, parseImageJson } = require('../utils/formatters');
const { getImageUrl } = require('../utils/s3');

router.get('/:formId', async (req, res) => {
  const { formId } = req.params;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await handleCandidateRequest(formId, res);
    } catch (err) {
      if (attempt < maxRetries && (err.code === 'ETIMEOUT' || err.code === 'ESOCKET')) {
        console.log(`Retry ${attempt + 1} for formId ${formId}`);
        continue;
      }
      console.error('Error fetching candidate:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

async function handleCandidateRequest(formId, res) {
  const pool = await getPool();

  const mainResult = await pool.request().input('formId', sql.BigInt, formId).query(`
      SELECT f.[FormID] AS [applicationId], p.[ProjectName] AS [projectName],
        v.[Vacancy_Name] AS [appliedFor], p.[ClosingDate] AS [closingDate],
        f.[AppliedOn] AS [appliedOn], c.[IsPaid] AS [paymentStatus], c.[PaidOn] AS [paidOn],
        f.[IsReviewed] AS [reviewStatus], u.[UserName] AS [reviewedBy],
        fr.[ReviewedDate] AS [reviewedOn], fr.[Comments] AS [reviewComments],
        f.[FullName] AS [fullName], f.[CNIC] AS [cnic], f.[PhoneNumber] AS [phoneNumber],
        f.[Email] AS [email], f.[CID] AS [candId],
        ai.[FatherName], ai.[GuardianName], ai.[RelationWithGuardian],
        ai.[DateOfBirth], ai.[Gender], ai.[Religion],
        ai.[GovernmentServant], ai.[Disability], ai.[MaritalStatus],
        d.[Name] AS [domicileDistrict], t.[TalukaName] AS [domicileTaluka],
        addr.[DomicileNo], addr.[PRCNo], addr.[DomicileIssuanceDate], addr.[PRCIssuanceDate],
        addr.[UnionCouncil], addr.[UrbanRural], addr.[OriginalDuplicate],
        addr.[PlaceOfPosting], addr.[CurrentAddress], addr.[PostalAddress], addr.[PermanentAddress]
      FROM [STSDB].[dbo].[Forms] f
      INNER JOIN [STSDB].[dbo].[Challans] c ON f.[FormID] = c.[FormID]
      INNER JOIN [STSDB].[dbo].[Projects] p ON f.[ProjectID] = p.[ID]
      INNER JOIN [STSDB].[dbo].[Vacancies] v ON f.[VacancyID] = v.[VID]
      LEFT JOIN [STSDB].[dbo].[FormReviews] fr ON f.[FormID] = fr.[FormId]
      LEFT JOIN [STSDB].[dbo].[Users] u ON fr.[ReviewedByUser] = u.[UserId]
      LEFT JOIN [STSDB].[dbo].[ApplicantInformation] ai ON f.[FormID] = ai.[FormId]
      LEFT JOIN [STSDB].[dbo].[AddressInformation] addr ON f.[FormID] = addr.[FormId]
      LEFT JOIN [STSDB].[dbo].[Districts] d ON addr.[DomicileDistrict] = d.[DistrictID]
      LEFT JOIN [STSDB].[dbo].[Talukas] t ON addr.[DomicileTaluka] = t.[TalukaID]
      WHERE f.[FormID] = @formId`);

  if (!mainResult.recordset.length) return res.status(404).json({ error: 'Candidate not found' });
  const main = mainResult.recordset[0];

  const [eduResult, diplomaResult, employmentResult, expResult, s3Result, superReviewResult, ticketResult, ticketReplyResult, queryResult, queryReplyResult] = await Promise.all([
    pool.request().input('fid', sql.BigInt, formId).query(`
      SELECT al.[AcademicLevelName] AS degreeName, co.[name] AS country,
        bu.[BoardUniversity] AS boardUniversity, ai.[PercentGrade] AS percentage,
        ai.[Grade] AS gradeCgpaDivision, ai.[DateofResultDeclaration] AS resultDeclarationDate,
        ai.[PassingYear] AS passingYear, ai.[MajorCourses] AS majorCourses,
        ai.[MarksheetFile] AS marksheetFile, ai.[DegreeFile] AS degreeFile
      FROM [STSDB].[dbo].[AcademicInfo] ai
      LEFT JOIN [STSDB].[dbo].[AcademicLevels] al ON ai.[DegreeType] = al.[ID]
      LEFT JOIN [STSDB].[dbo].[BoardUniversities] bu ON ai.[BoardUniversitiesId] = bu.[Id]
      LEFT JOIN [STSDB].[dbo].[countries] co ON ai.[CountryId] = co.[Id]
      WHERE ai.[FormID] = @fid AND ai.[IsDelete] = 0 ORDER BY ai.[DegreeType]`),
    pool.request().input('fid', sql.BigInt, formId).query(`
      SELECT [DegreeType] AS certificateName, [DegreeDuration] AS duration,
        [InstituteName] AS instituteName, [StartDate] AS startDate,
        [EndDate] AS endDate, [Certificate] AS certificateFile
      FROM [STSDB].[dbo].[AdditionalAcademicDetails]
      WHERE [FormID] = @fid AND (IsDelete = 0 OR IsDelete IS NULL)`),
    pool.request().input('fid', sql.BigInt, formId).query(`
      SELECT [EmploymentStatus],[Department],[Designation],[BPS],
        [DateOfJoining],[DateOfRetirement],[NOCDocument],[NOCIssueDate]
      FROM [STSDB].[dbo].[EmploymentStatus] WHERE [FormID] = @fid`),
    pool.request().input('fid', sql.BigInt, formId).query(`
      SELECT [DepartmentType],[DepartmentName],[PositionHeld],[StartDate],[EndDate],[IsPresentJob],[ApplicantExperienceCertificate]
      FROM [STSDB].[dbo].[ApplicantExperience]
      WHERE [FormID] = @fid AND (IsDelete IS NULL OR IsDelete = 0)`),
    pool.request().input('cid', sql.BigInt, main.candId).query(`
      SELECT [ObjectType],[ObjectName],[VersionId]
      FROM [STSDB].[dbo].[S3Objects] WHERE [CandId] = @cid`),
    pool.request().input('fid', sql.BigInt, formId).query(`
      SELECT TOP 1 sr.[SuperReviewer_Action] AS action,
        sr.[SuperReviewerAccepted_Rejected] AS accepted,
        sr.[SuperReviewer_Comments] AS comments,
        sr.[CreatedAt] AS reviewedOn,
        u.[UserName] AS reviewerName
      FROM [STSDB].[dbo].[SuperReviewer] sr
      LEFT JOIN [STSDB].[dbo].[Users] u ON sr.[SuperReviewerId] = u.[UserId]
      WHERE sr.[FormId] = @fid AND (sr.[IsDelete] = 0 OR sr.[IsDelete] IS NULL)
      ORDER BY sr.[CreatedAt] DESC`),
    pool.request().input('fid', sql.BigInt, formId).query(`
      SELECT t.[Id], t.[Text], t.[ExpHours], t.[Status], t.[IsReplied],
        t.[CreatedAt], t.[ResolveAt], ot.[ObjectionType],
        uc.[UserName] AS createdByName, ur.[UserName] AS resolvedByName
      FROM [STSDB].[dbo].[Ticket] t
      LEFT JOIN [STSDB].[dbo].[ObjectionTypes] ot ON t.[ObjectionId] = ot.[ID]
      LEFT JOIN [STSDB].[dbo].[Users] uc ON t.[CreatedBy] = uc.[UserId]
      LEFT JOIN [STSDB].[dbo].[Users] ur ON t.[ResolveBy] = ur.[UserId]
      WHERE t.[FormId] = @fid
      ORDER BY t.[CreatedAt] DESC`),
    pool.request().input('fid', sql.BigInt, formId).query(`
      SELECT tr.[TicketId], tr.[Reply], tr.[ReplyAttachment],
        tr.[RepliedBy], tr.[ReplyAt]
      FROM [STSDB].[dbo].[TicketReply] tr
      INNER JOIN [STSDB].[dbo].[Ticket] t ON tr.[TicketId] = t.[Id]
      WHERE t.[FormId] = @fid AND (tr.[IsDeleted] = 0 OR tr.[IsDeleted] IS NULL)
      ORDER BY tr.[ReplyAt] ASC`),
    pool.request().input('fid', sql.BigInt, formId).query(`
      SELECT q.[Id], q.[QueryType], q.[InitiatedBy], q.[QueryMessage],
        q.[QueryAttachment], q.[QueryCreatedDateTime],
        q.[IsReplied], q.[QueryResponse], q.[QueryResponseComment],
        q.[QueryResponseAttachment], q.[ResponseDateTime]
      FROM [STSDB].[dbo].[Queries] q
      WHERE q.[FromId] = @fid AND (q.[IsDeleted] = 0 OR q.[IsDeleted] IS NULL)
      ORDER BY q.[QueryCreatedDateTime] DESC`),
    pool.request().input('fid', sql.BigInt, formId).query(`
      SELECT qr.[QueryId], qr.[ReplyMessage], qr.[ReplyAttachment],
        qr.[ReplyBy], qr.[ReplyDateTime]
      FROM [STSDB].[dbo].[QueriesReply] qr
      INNER JOIN [STSDB].[dbo].[Queries] q ON qr.[QueryId] = q.[Id]
      WHERE q.[FromId] = @fid AND (qr.[IsActive] = 1 OR qr.[IsActive] IS NULL)
      ORDER BY qr.[ReplyDateTime] ASC`)
  ]);

  const s3Objects = s3Result.recordset.reverse();
  const find = (...types) => s3Objects.find(o => types.includes(o.ObjectType));
  const url = (obj) => obj ? getImageUrl(obj.ObjectType, obj.ObjectName, obj.VersionId) : '';

  const passportObj = find('Images', 'ApplicantImages');
  const cnicFrontObj = find('CnicFront', 'ApplicantCNIC');
  const cnicBackObj = find('CnicBack', 'ApplicantNICBack');
  const domicileObj = find('Domicile', 'ApplicantDomicileFiles');
  const prcObj = find('PRC');
  const matricDegreeObj = find('MatricDegree', 'ApplicantMatricDegreeFiles');
  const lastDegreeObj = find('Degree');
  const diplomaCertObj = find('DiplomaCertificates');

  res.json({
    applicationId: String(main.applicationId),
    projectName: main.projectName?.trim() || '',
    appliedFor: main.appliedFor || '',
    closingDate: formatDateOnly(main.closingDate),
    appliedOn: formatDate(main.appliedOn),
    paymentInfo: { status: main.paymentStatus ? 'Challan Paid' : 'Unpaid', paidOn: formatDate(main.paidOn) },
    reviewInfo: { status: main.reviewStatus ? 'Reviewed' : 'Not Reviewed', reviewedBy: main.reviewedBy || '', reviewedOn: formatDate(main.reviewedOn), comments: main.reviewComments || '' },
    personalInfo: {
      fullName: main.fullName || '', cnic: String(main.cnic || ''),
      mobileNumber: main.phoneNumber || '', emailAddress: main.email || '',
      fatherHusbandName: main.FatherName || '', guardianName: main.GuardianName || '',
      relationWithGuardian: main.RelationWithGuardian || '',
      dateOfBirth: formatDateOnly(main.DateOfBirth),
      ageInWords: main.DateOfBirth ? calcAge(main.DateOfBirth, main.closingDate) : '',
      gender: main.Gender || '', religion: main.Religion || '',
      governmentServant: main.GovernmentServant != null ? (main.GovernmentServant ? 'Yes' : 'No') : '',
      disability: main.Disability != null ? (main.Disability ? 'Yes' : 'No') : '',
      maritalStatus: main.MaritalStatus || ''
    },
    addressInfo: {
      domicileDistrict: main.domicileDistrict || '', domicileTaluka: main.domicileTaluka || '',
      domicileNo: main.DomicileNo || '', prcNo: main.PRCNo || '',
      domicileIssuanceDate: formatDateOnly(main.DomicileIssuanceDate),
      prcIssuanceDate: formatDateOnly(main.PRCIssuanceDate),
      unionCouncil: main.UnionCouncil || '', urbanRural: main.UrbanRural || '',
      originalDuplicate: main.OriginalDuplicate || '',
      preferredPlaceOfPosting: main.PlaceOfPosting || '',
      currentAddress: main.CurrentAddress || '', postalAddress: main.PostalAddress || '',
      permanentAddress: main.PermanentAddress || ''
    },
    education: eduResult.recordset.map(e => {
      let marksheetUrl = '', degreeUrl = '';
      const msJson = parseImageJson(e.marksheetFile);
      const dgJson = parseImageJson(e.degreeFile);
      if (msJson?.Image) { const o = s3Objects.find(x => x.ObjectName === msJson.Image && x.VersionId === msJson.VersionId); if (o) marksheetUrl = getImageUrl(o.ObjectType, o.ObjectName, o.VersionId); }
      if (dgJson?.Image) { const o = s3Objects.find(x => x.ObjectName === dgJson.Image && x.VersionId === dgJson.VersionId); if (o) degreeUrl = getImageUrl(o.ObjectType, o.ObjectName, o.VersionId); }
      return { degreeName: e.degreeName || '', country: e.country || '', boardUniversity: e.boardUniversity || '', percentage: e.percentage || '', gradeCgpaDivision: e.gradeCgpaDivision || '', resultDeclarationDate: formatDateOnly(e.resultDeclarationDate), passingYear: String(e.passingYear || ''), majorCourses: e.majorCourses || '', marksheetImage: marksheetUrl, degreeImage: degreeUrl };
    }),
    diplomas: diplomaResult.recordset.map(d => {
      let certUrl = '';
      const cJson = parseImageJson(d.certificateFile);
      if (cJson?.Image) { const o = s3Objects.find(x => x.ObjectName === cJson.Image && x.VersionId === cJson.VersionId); if (o) certUrl = getImageUrl(o.ObjectType, o.ObjectName, o.VersionId); }
      if (!certUrl && diplomaCertObj) certUrl = url(diplomaCertObj);
      return { certificateName: d.certificateName || '', duration: d.duration || '', startDate: formatDateOnly(d.startDate), endDate: formatDateOnly(d.endDate), instituteName: d.instituteName || '', certificateImage: certUrl };
    }),
    employment: employmentResult.recordset.map(e => ({ employmentStatus: e.EmploymentStatus || '', department: e.Department || '', designation: e.Designation || '', bps: e.BPS || '', dateOfJoining: formatDateOnly(e.DateOfJoining), dateOfRetirement: formatDateOnly(e.DateOfRetirement), nocDocument: e.NOCDocument || '', nocIssueDate: formatDateOnly(e.NOCIssueDate) })),
    experience: expResult.recordset.map(e => {
      let expCertUrl = '';
      const expJson = parseImageJson(e.ApplicantExperienceCertificate);
      if (expJson?.Image) {
        const imgName = expJson.Image.includes('/') ? expJson.Image.split('/').pop() : expJson.Image;
        expCertUrl = getImageUrl('ExperienceCertificates', imgName, expJson.VersionId);
      }
      return { departmentType: e.DepartmentType || '', departmentName: e.DepartmentName || '', positionHeld: e.PositionHeld || '', startDate: formatDateOnly(e.StartDate), endDate: formatDateOnly(e.EndDate), isPresentJob: e.IsPresentJob || '', certificateImage: expCertUrl };
    }),
    images: { passportImage: url(passportObj), cnicFront: url(cnicFrontObj), cnicBack: url(cnicBackObj), domicileImage: url(domicileObj), prcImage: url(prcObj), matricDegree: url(matricDegreeObj), lastDegree: url(lastDegreeObj), diplomaCertificate: url(diplomaCertObj) },
    superReviewInfo: superReviewResult.recordset.length > 0 ? {
      status: superReviewResult.recordset[0].accepted ? 'Accepted' : 'Rejected',
      action: superReviewResult.recordset[0].action || '',
      comments: superReviewResult.recordset[0].comments || '',
      reviewedBy: superReviewResult.recordset[0].reviewerName || '',
      reviewedOn: formatDate(superReviewResult.recordset[0].reviewedOn)
    } : null,
    objections: ticketResult.recordset.map(t => {
      const replies = ticketReplyResult.recordset
        .filter(r => r.TicketId === t.Id)
        .map(r => {
          let attachmentUrl = '';
          const attJson = parseImageJson(r.ReplyAttachment);
          if (attJson?.Image) attachmentUrl = getImageUrl('TicketReplyAttachment', attJson.Image, attJson.VersionId);
          return {
            message: r.Reply || '',
            repliedBy: r.RepliedBy || '',
            repliedAt: formatDate(r.ReplyAt),
            attachment: attachmentUrl
          };
        });
      return {
        id: t.Id,
        text: t.Text || '',
        expHours: t.ExpHours || 0,
        status: t.IsReplied ? (t.ResolveAt ? 'Resolved' : 'Replied') : 'Open',
        createdAt: formatDate(t.CreatedAt),
        createdBy: t.createdByName || '',
        resolvedAt: formatDate(t.ResolveAt),
        resolvedBy: t.resolvedByName || '',
        replies
      };
    }),
    queries: queryResult.recordset.map(q => {
      let queryAttachUrl = '';
      const qAttJson = parseImageJson(q.QueryAttachment);
      if (qAttJson?.Key) {
        const parts = qAttJson.Key.split('/');
        const folder = parts.length > 1 ? parts[0] : 'QueryAttachment';
        const fileName = parts.length > 1 ? parts[1] : parts[0];
        queryAttachUrl = getImageUrl(folder, fileName, qAttJson.VersionId);
      }
      const replies = queryReplyResult.recordset
        .filter(r => r.QueryId === q.Id)
        .map(r => {
          let replyAttachUrl = '';
          const rAttJson = parseImageJson(r.ReplyAttachment);
          if (rAttJson?.Image) replyAttachUrl = getImageUrl('QueriesReplyAttachment', rAttJson.Image, rAttJson.VersionId);
          return {
            message: r.ReplyMessage || '',
            repliedBy: r.ReplyBy || '',
            repliedAt: formatDate(r.ReplyDateTime),
            attachment: replyAttachUrl
          };
        });
      return {
        id: q.Id,
        queryType: q.QueryType || '',
        initiatedBy: q.InitiatedBy || '',
        message: q.QueryMessage || '',
        attachment: queryAttachUrl,
        createdAt: formatDate(q.QueryCreatedDateTime),
        status: q.QueryResponse ? 'Resolved' : (q.IsReplied ? 'Replied' : 'Open'),
        responseComment: q.QueryResponseComment || '',
        respondedAt: formatDate(q.ResponseDateTime),
        replies
      };
    })
  });
}

module.exports = router;

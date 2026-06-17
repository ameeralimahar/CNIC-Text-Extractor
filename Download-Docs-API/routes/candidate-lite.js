const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');
const { formatDateOnly } = require('../utils/formatters');
const { getImageUrl } = require('../utils/s3');

router.get('/:formId', async (req, res) => {
  const { formId } = req.params;
  try {
    const pool = await getPool();

    const result = await pool.request().input('formId', sql.BigInt, formId).query(`
      SELECT f.[FormID] AS [applicationId], p.[ProjectName] AS [projectName],
        v.[Vacancy_Name] AS [appliedFor], f.[FullName] AS [fullName],
        f.[CNIC] AS [cnic], f.[CID] AS [candId],
        ai.[FatherName], ai.[DateOfBirth], ai.[Gender], ai.[Disability]
      FROM [STSDB].[dbo].[Forms] f
      INNER JOIN [STSDB].[dbo].[Projects] p ON f.[ProjectID] = p.[ID]
      INNER JOIN [STSDB].[dbo].[Vacancies] v ON f.[VacancyID] = v.[VID]
      LEFT JOIN [STSDB].[dbo].[ApplicantInformation] ai ON f.[FormID] = ai.[FormId]
      WHERE f.[FormID] = @formId`);

    if (!result.recordset.length) return res.status(404).json({ error: 'Candidate not found' });
    const main = result.recordset[0];

    const s3Result = await pool.request().input('cid', sql.BigInt, main.candId).query(`
      SELECT [ObjectType],[ObjectName],[VersionId]
      FROM [STSDB].[dbo].[S3Objects]
      WHERE [CandId] = @cid AND [ObjectType] IN ('CnicFront','ApplicantCNIC','CnicBack','ApplicantNICBack')`);

    const s3Objects = s3Result.recordset.reverse();
    const find = (...types) => s3Objects.find(o => types.includes(o.ObjectType));
    const url = (obj) => obj ? getImageUrl(obj.ObjectType, obj.ObjectName, obj.VersionId) : '';

    res.json({
      applicationId: String(main.applicationId),
      projectName: main.projectName?.trim() || '',
      appliedFor: main.appliedFor || '',
      personalInfo: {
        fullName: main.fullName || '',
        cnic: String(main.cnic || ''),
        fatherHusbandName: main.FatherName || '',
        dateOfBirth: formatDateOnly(main.DateOfBirth),
        gender: main.Gender || '',
        disability: main.Disability != null ? (main.Disability ? 'Yes' : 'No') : ''
      },
      images: {
        cnicFront: url(find('CnicFront', 'ApplicantCNIC')),
        cnicBack: url(find('CnicBack', 'ApplicantNICBack'))
      }
    });
  } catch (err) {
    console.error('Error fetching candidate-lite:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

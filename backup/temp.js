//get Terretories
function getTerritory() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "territory",
    "?$select=territoryid,name"
  );
}

//get Care Types
function getCareType() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "bookableresourcecategory",
    "?$select=name&$filter=statecode%20eq%200"
  );
}

//get Bookable Resources
function getBookableResources() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "bookableresource",
    "?$filter=statecode%20eq%200&$select=name,resourcetype,_calendarid_value&$expand=UserId($select=entityimage_url),msdyn_bookableresource_msdyn_resourceterritory_Resource($select=msdyn_resourceterritoryid,msdyn_name,_msdyn_resource_value,_msdyn_territory_value,statecode)"
  );
}

//get Time Off Requests
function getTimeOffRequests() {
  const { startDate, endDate } = getAdjustedDateRangeFromCalendar();
  const query = [
    "?$select=msdyn_endtime,vel_leavetype,msdyn_name,_msdyn_resource_value,msdyn_starttime",
    "&$filter=msdyn_starttime le " +
      endDate +
      " and msdyn_endtime ge " +
      startDate,
  ].join("");

  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "msdyn_timeoffrequest",
    query
  );
}

//get Holidays
function getHolidays() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "crce0_ph_auto",
    "?$select=crce0_ph_autoid,crce0_date,crce0_holidayname"
  );
}

//get Agreement Booking
function getAgreementBookingDatesBetween() {
  const { startDate, endDate } = getAdjustedDateRangeFromCalendar();

  const query = [
    "?$select=msdyn_agreementbookingdateid,_msdyn_agreement_value,msdyn_bookingdate,msdyn_name,_msdyn_resource_value,msdyn_status,statecode",
    "&$filter=msdyn_bookingdate ge " +
      startDate +
      " and msdyn_bookingdate le " +
      endDate,
    "&$expand=",
    "msdyn_resource($select=name),",
    "msdyn_bookingsetup($select=sog_placeholdertypecode,msdyn_agreementbookingsetupid,msdyn_estimatedduration,_ang_incidenttype_value),",
    "msdyn_workorder($select=msdyn_workorderid,msdyn_city,msdyn_country,msdyn_postalcode,_msdyn_serviceterritory_value,msdyn_stateorprovince,msdyn_address1,msdyn_address2,msdyn_address3,msdyn_systemstatus),",
    "msdyn_bookingsetup($select=sog_selectedincidentservices)",
  ].join("");

  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "msdyn_agreementbookingdate",
    query
  );
}

//get Service Types
function getServiceType() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "msdyn_incidenttype",
    "?$select=msdyn_name"
  );
}

//get Bookable Resources with Category
function getBookableResourcesWithCategory() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "bookableresource",
    "?$select=bookableresourceid,name&$expand=bookableresource_bookableresourcecategoryassn_Resource"
  );
}

//Batch call to get workhours patterns
async function processCalendarRulesBatchDetailed(batch) {
  const boundary = generateBatchBoundary();

  const requests = batch.map((calendarId) => {
    // expand only calendar_calendar_rules (no nested expands)
    const url = `/api/data/v9.2/calendars(${calendarId})?$select=calendarid&$expand=calendar_calendar_rules($select=calendarruleid,_innercalendarid_value,pattern,starttime,effectiveintervalend,createdon,duration)`;
    return {
      method: "GET",
      url,
      headers: {
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: 'odata.include-annotations="*"',
      },
    };
  });

  const requestsMeta = batch.map((calendarId, idx) => ({
    contentId: idx + 1,
    calendarId,
  }));

  const body = createBatchRequestBody(requests, boundary);

  const response = await fetch(
    `${window.parent.Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.2/$batch`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Calendar rules (detailed) batch failed: ${response.status}`
    );
  }

  const text = await response.text();
  // parseBatchResponse should return an array of calendar entities
  return parseBatchResponse(text, requestsMeta);
}

//Batch call to get timings of pattern
async function processInnerCalendarsBatch(batch) {
  const boundary = generateBatchBoundary();

  const requests = batch.map((calendarId) => {
    // fetch the inner calendar and expand its calendar_calendar_rules to read offset/duration
    const url = `/api/data/v9.2/calendars(${calendarId})?$select=calendarid&$expand=calendar_calendar_rules($select=calendarruleid,offset,duration,starttime,endtime,pattern)`;
    return {
      method: "GET",
      url,
      headers: {
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: 'odata.include-annotations="*"',
      },
    };
  });

  const requestsMeta = batch.map((calendarId, idx) => ({
    contentId: idx + 1,
    calendarId,
  }));

  const body = createBatchRequestBody(requests, boundary);

  const response = await fetch(
    `${window.parent.Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.2/$batch`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(`Inner calendars batch failed: ${response.status}`);
  }

  const text = await response.text();
  return parseBatchResponse(text, requestsMeta);
}

//These are the fallback function if btach processing fails

// Fallback: individual fetch for parent calendars (if batch fails)
async function processCalendarRulesIndividually(batch) {
  const promises = batch.map(async (calendarId) => {
    try {
      const url = `${window.parent.Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.2/calendars(${calendarId})?$select=calendarid&$expand=calendar_calendar_rules($select=calendarruleid,_innercalendarid_value,pattern,starttime,effectiveintervalend,createdon,duration)`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
          Prefer: 'odata.include-annotations="*"',
        },
      });
      if (!res.ok) {
        console.warn(
          `Individual fetch failed for ${calendarId}: ${res.status}`
        );
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn(`Individual fetch error for ${calendarId}:`, err.message);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter(Boolean);
}

async function processInnerCalendarsIndividually(batch) {
  const promises = batch.map(async (calendarId) => {
    try {
      const url = `${window.parent.Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.2/calendars(${calendarId})?$select=calendarid&$expand=calendar_calendar_rules($select=calendarruleid,offset,duration,starttime,endtime,pattern)`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
          Prefer: 'odata.include-annotations="*"',
        },
      });
      if (!res.ok) {
        console.warn(
          `Inner individual fetch failed for ${calendarId}: ${res.status}`
        );
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn(
        `Inner individual fetch error for ${calendarId}:`,
        err.message
      );
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter(Boolean);
}

//Expanding Calander via Batch Request (Not using anymore as we have new implementation for work hours pattern)
async function processBatch(batch, startDate, endDate) {
  const boundary = generateBatchBoundary();
  const requests = batch.map((calendarId) => {
    const functionQuery = `calendars(${calendarId})/Microsoft.Dynamics.CRM.ExpandCalendar(Start=@d1,End=@d2)?@d1=${startDate}&@d2=${endDate}`;
    return {
      method: "GET",
      url: `/api/data/v9.0/${functionQuery}`,
      headers: {
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: 'odata.include-annotations="*"',
      },
    };
  });

  // Track mapping between Content-ID and calendarId
  const requestsMeta = batch.map((calendarId, idx) => ({
    contentId: idx + 1,
    calendarId,
  }));

  const body = createBatchRequestBody(requests, boundary);

  const response = await fetch(
    `${window.parent.Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.0/$batch`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(`Batch failed: ${response.status}`);
  }

  const text = await response.text();
  return parseBatchResponse(text, requestsMeta);
}
// Fallback function for individual requests when batch fails (Not using anymore)
async function processBatchIndividually(batch, startDate, endDate) {
  const promises = batch.map(async (calendarId) => {
    try {
      const functionQuery = `calendars(${calendarId})/Microsoft.Dynamics.CRM.ExpandCalendar(Start=@d1,End=@d2)?@d1=${startDate}&@d2=${endDate}`;

      const response = await fetch(
        `${window.parent.Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.0/${functionQuery}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Prefer: 'odata.include-annotations="*"',
          },
        }
      );

      if (!response.ok) {
        console.warn(
          `Failed to fetch calendar ${calendarId}: HTTP ${response.status}`
        );
        return { result: [] };
      }

      const data = await response.json();
      const items = data?.result || data?.value || [];
      const normalized = Array.isArray(items) ? items : [items];
      normalized.forEach((item) => {
        try {
          item.QueriedCalendarId = calendarId;
        } catch (_) {}
      });
      return normalized;
    } catch (error) {
      console.warn(`Error fetching calendar ${calendarId}:`, error.message);
      return [];
    }
  });

  const chunks = await Promise.all(promises);
  // Flatten
  return chunks.flat();
}

const async = require('async');
const helpers = require('../../../helpers/azure');

module.exports = {
    title: 'Security Configuration Monitoring',
    category: 'Security Center',
    description: 'Ensure that Security Configuration Monitoring is set to audit on the Default Policy',
    more_info: 'By enabling audit on Security Configuration Monitoring, Security Vulnerabilities on machines can be detected, keeping security up to date and following security best practices.',
    recommended_action: '1. Go to Azure Security Center 2. Click on Security policy 3. Click on your Subscription 4. Click on ASC Default 5. Look for the Vulnerabilities in security configuration on your machines should be remediated setting. 6. Ensure that it is set to AuditIfNotExists',
    link: 'https://docs.microsoft.com/en-us/azure/governance/policy/overview',
    apis: ['policyAssignments:list'],

    run: function(cache, settings, callback) {
        const results = [];
        const source = {};
        const locations = helpers.locations(settings.govcloud);

        async.each(locations.policyAssignments, function (location, rcb) {

            const policyAssignments = helpers.addSource(cache, source,
                ['policyAssignments', 'list', location]);

            if (!policyAssignments) return rcb();

            if (policyAssignments.err || !policyAssignments.data) {
                helpers.addResult(results, 3,
                    'Unable to query Policy Assignments: ' + helpers.addError(policyAssignments), location);
                return rcb();
            }

            if (!policyAssignments.data.length) {
                helpers.addResult(results, 0, 'No existing Policy Assignments', location);
                return rcb();
            }

            const policyAssignment = policyAssignments.data.find((policyAssignment) => {
                return (policyAssignment.displayName &&
                    policyAssignment.displayName.includes("ASC Default")) ||
                    (policyAssignment.displayName &&
                        policyAssignment.displayName.includes("ASC default"));
            });

            if (!policyAssignment) {
                helpers.addResult(results, 0, 'There are no existing ASC Default Policy Assignments.', location);
                return rcb();
            }

            if (policyAssignment.parameters &&
                policyAssignment.parameters.systemConfigurationsMonitoringEffect &&
                policyAssignment.parameters.systemConfigurationsMonitoringEffect.value &&
                policyAssignment.parameters.systemConfigurationsMonitoringEffect.value === 'Disabled') {

                helpers.addResult(results, 2,
                    'Security configuration Policy Assignment is Disabled.', location);
            } else {
                helpers.addResult(results, 0,
                    'Security configuration Policy Assignment is Enabled.', location);
            }
            rcb();
        }, function () {
            // Global checking goes here
            callback(null, results, source);
        });
    }
};

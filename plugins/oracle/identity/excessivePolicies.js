var async = require('async');

var helpers = require('../../../helpers/oracle/');

module.exports = {
    title: 'Excessive Policies',
    category: 'Identity',
    description: 'Determine if there are an excessive number of policies in the account',
    more_info: 'Keeping the number of policies to a minimum helps reduce the chances of compromised accounts causing catastrophic damage to the account. Rather than creating new policies with the same statement for each group, common statements should be grouped under the same policy. ',
    recommended_action: 'Limit the number of policies to prevent accidental authorizations',
    link: 'https://docs.cloud.oracle.com/iaas/Content/Identity/Concepts/policygetstarted.htm',
    apis: ['policy:list'],
    
    settings: {
        excessive_policy_fail: {
            name: 'Excessive Policies Fail',
            description: 'Return a failing result when the number of Policies exceeds this value',
            regex: '^[1-9]{1}[0-9]{0,5}$',
            default: 25
        },
        excessive_policy_warn: {
            name: 'Excessive Policies Warn',
            description: 'Return a warning result when the number of Policies exceeds this value',
            regex: '^[1-9]{1}[0-9]{0,5}$',
            default: 15
        }
    },

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var regions = helpers.regions(settings.govcloud);
        var config = {
            excessive_policy_fail: settings.excessive_policy_fail || this.settings.excessive_policy_fail.default,
            excessive_policy_warn: settings.excessive_policy_warn || this.settings.excessive_policy_warn.default
        };

        var custom = helpers.isCustom(settings, this.settings);

        async.each(regions.default, function(region, rcb){

            if (helpers.checkRegionSubscription(cache, source, results, region)) {

                var policies = helpers.addSource(cache, source,
                    ['policy', 'list', region]);

                if (!policies) return rcb();

                if (policies.err || !policies.data) {
                    helpers.addResult(results, 3,
                        'Unable to query for Policies: ' + helpers.addError(policies), region);
                    return rcb();
                };

                if (!policies.data.length) {
                    helpers.addResult(results, 0, 'No Policies present', region);
                    return rcb();
                };

                var policyAmt = policies.data.length;

                var returnMsg = ' number of policies: ' + policyAmt + ' present';

                if (policyAmt > config.excessive_policy_fail) {
                    helpers.addResult(results, 2, 'Excessive' + returnMsg, region, null, custom);
                } else if (policyAmt > config.excessive_policy_warn) {
                    helpers.addResult(results, 1, 'Large' + returnMsg, region, null, custom);
                } else {
                    helpers.addResult(results, 0, 'Acceptable' + returnMsg, region, null, custom);
                };
            }
            rcb();
        }, function(){
            // Global checking goes here
            callback(null, results, source);
        });
    }
};
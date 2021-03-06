const async = require('async');
const helpers = require('../../../helpers/azure');

module.exports = {
    title: 'Default Security Group',
    category: 'Network Security Groups',
    description: 'Ensure the default security groups block all traffic by default.',
    more_info: 'The default security group is often used for resources launched without a defined security group. For this reason, the default rules should be to block all traffic to prevent an accidental exposure.',
    link: 'https://docs.microsoft.com/en-us/azure/virtual-network/manage-network-security-group',
    recommended_action: 'Update the rules for the default security group to deny all traffic by default.',
    apis: ['networkSecurityGroups:listAll'],
    compliance: {
        pci: 'PCI has strict requirements to segment networks using firewalls. ' +
             'Security groups are a software-layer firewall that should be used ' +
             'to isolate resources. Ensure default security groups to not allow ' +
             'unintended traffic to cross these isolation boundaries.'
    },

    run: function (cache, settings, callback) {
        const results = [];
        const source = {};
        const locations = helpers.locations(settings.govcloud);

        async.each(locations.networkSecurityGroups, function (location, rcb) {

            let networkSecurityGroups = helpers.addSource(
                cache, source, ['networkSecurityGroups', 'listAll', location]
            );

            if (!networkSecurityGroups) return rcb();

            if (networkSecurityGroups.err || !networkSecurityGroups.data) {
                helpers.addResult(results, 3, 
                    'Unable to query Network Security Groups: ' + helpers.addError(networkSecurityGroups), location);
                return rcb();
            }

            if (!networkSecurityGroups.data.length) {
                helpers.addResult(results, 0, 'No security groups present', location);
                return rcb();
            }

            for (s in networkSecurityGroups.data) {
                var sg = networkSecurityGroups.data[s];

                if(sg.defaultSecurityRules &&
                    sg.defaultSecurityRules.length) {

                    var denyRuleInbound = false;
                    var denyRuleOutbound = false;

                    var denyRules = sg.defaultSecurityRules.filter((rule) => {
                        return rule.access == 'Deny'
                    });

                    for (rule in denyRules){
                        if (
                            denyRules[rule].destinationAddressPrefix == "*" &&
                            denyRules[rule].destinationPortRange == "*" &&
                            denyRules[rule].protocol == "*" &&
                            denyRules[rule].provisioningState == "Succeeded" &&
                            denyRules[rule].sourceAddressPrefix == "*" &&
                            denyRules[rule].sourcePortRange == "*"
                        )
                        {
                            if (denyRules[rule].direction=='Inbound') denyRuleInbound = true;
                            if (denyRules[rule].direction=='Outbound') denyRuleOutbound = true;
                        }
                    }

                    if (
                        denyRuleInbound &&
                        denyRuleOutbound
                    ) {
                        helpers.addResult(results, 0,
                            'The security group: ' + sg.name +' does have all the required default inbound and outbound rules. ',
                            location);
                    } else {
                        helpers.addResult(results, 2,
                            'Default rules for the security group: ' + sg.name +' are incomplete. ' + (denyRuleInbound ? 'Inbound: OK. ' : 'Outbound: Fail. ') + (denyRuleOutbound ? 'Outbound: OK.' : 'Outbound: Fail.'),
                            location);
                    }
                } else {
                    helpers.addResult(results, 2,
                        'Default security group for '+ sg.name +' is missing one or more default inbound or outbound rules',
                        location);
                }
            }
            rcb();
        }, function () {
            callback(null, results, source);
        });
    }
};
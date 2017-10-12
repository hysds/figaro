

CONTAINERS = [];
JOBSPECS = [];
HYSDSIOS = [];
/**
 * 
 */
function makeEnumerable(enumerables, dflt) {
    tag = $("<select />");
    for (var i = 0; i < enumerables.length; i++) {
        var optval = enumerables[i];
        var opt = $("<option>"+optval+"</option>");
        if (optval == dflt) {
            opt.prop("selected",true);
        }
        tag.append(opt);
    }
    return tag
}
/**
 * Refine the list of enumerables
 */
function getVersionEnumerables(names, version_re) {
    var enums = [];
    var re = /./
    try {
        re = new RegExp(version_re);
    } catch(e) {}
    for (var k = 0; k < names.length; k++) {
        var splits = names[k].split(":");
        if (!re.test(splits[0])) {
            continue;
        }
        enums.push(splits[splits.length - 1]);
    }
    return enums;
}

/**
 * Build an input given type
 * @param kwarg: kwarg
 */
function buildInput(dyn_fields,field_groups,kwarg,cur_kwargs,query) {
    if (kwarg.group !== undefined && !(kwarg.group in field_groups)) {
        dyn_fields.append("<legend><font color='blue'>" + kwarg.group + "</font></legend>");
        field_groups[kwarg.group] = true;
    }
    //Group element
    var elem = $("<div class='control-group'>" +
                   "<label class='control-label' for='" + kwarg.name + "'>"+kwarg.name+"</label>" +
                   "<div class='controls'></div>" +
                 "</div>");
    dyn_fields.append(elem); 
    //What to do given type
    var tag=$("<input />");
    var rule = kwarg.validator || {"required": !kwarg.optional};
    switch (kwarg.type) {
        default:
        case "text":
            tag.attr("type","text");
            break;
        case "number":
            tag.attr("type","number");
            rule["number"] = true;
            break;
        case "datetime":
            tag.attr("type","datetime");
            rule["datetime"] = true;
            break;
        case "date":
            tag.attr("type","date");
            rule["dateISO"] = true;
            break;
        case "boolean":
            kwarg.enumerables = ["true","false"];     
        case "enum":
            tag = makeEnumerable(kwarg.enumerables, kwarg.default);
            break;
        case "email":
            tag.attr("type","email");
            rule["email"] = true;
            break;
        case "textarea":
            tag = $("<textarea />");
            break;
        case "region":
            tag = $("<textarea />");
            //rule["geo"] = true;
            regval = "";
            try
            {
                regval = JSON.stringify(query["filtered"]["filter"]["geo_shape"]["location"]["shape"], null, '  ');
            }catch(e){}
            tag.val(regval);
            break;
        case "container_version":
            tag = makeEnumerable(getVersionEnumerables(CONTAINERS, kwarg.version_regex),
                                  kwarg.default, true);
            break;
        case "jobspec_version":
            tag = makeEnumerable(getVersionEnumerables(JOBSPECS, kwarg.version_regex),
                                  kwarg.default, true);
            break;
        case "hysdsio_version":
            tag = makeEnumerable(getVersionEnumerables(HYSDSIOS, kwarg.version_regex),
                                  kwarg.default, true);
            break;
    };
    //Shared attributes
    tag.attr("class","field span4");
    tag.attr("placeholder",kwarg.placeholder);
    if (tag.val() == "") {
        tag.val(kwarg.default);
    }
    tag.attr("name",kwarg.name);
    //Setup current arg
    if (kwarg.name in cur_kwargs) {
        tag.val(cur_kwargs[kwarg.name]);
    }
    $("div.controls",elem).append(tag);
    //Validation rules requires relocaitng tag
    var query = tag.prop("tagName")+"[name="+kwarg.name+"]";
    tag = $(query,elem);
    tag.rules("remove");
    tag.rules("add",rule);
}


function buildQueues(queueElement, data, sts, xhr) { 
    var queuesSpec = {"Recommended Queues":data.recommended,"All Queues":data.queues};
    var html_to_add = "";
    for (var key in queuesSpec)
    {
        var queues = queuesSpec[key];
        if (queues.length == 0) {
            continue;
        }
        html_to_add += "<option disabled>"+key+"</option>\n";
        for (var i = 0; i < queues.length; i++)
        {
            html_to_add += "<option value='"+queues[i]+"'>"+queues[i]+"</option>\n"
        }
    } 
    queueElement.html(html_to_add);
}



function buildWorkflows(action,workflow_type,dyn_fields,queueDrop,cur_kwargs,query) {
    //Call to get queues
    $.ajax({
        url: "user_rules/get_job_queues?job_type="+action.wiring["job-specification"],
        success: buildQueues.bind(undefined,queueDrop),
        error: function() { }
    });
    //Add dynamic fields to the form
    dyn_fields.empty();
    var kwargs = action.kwargs;
    if (kwargs.length > 0) {
        dyn_fields.append("<legend>" + workflow_type + " parameters</legend>");
    }
    var field_groups = {};
    for (var i=0; i < kwargs.length; i++) {
        buildInput(dyn_fields,field_groups,kwargs[i],cur_kwargs,query);
    }
}
/**
 * Build actions dropdown from input data
 * @param element: (bind this element when passed to ajax callback) element to build to
 * @param queue_group: (bind this element when passed to ajax callback) element handle queues
 * @param data: data from actions call
 * @param sts: status
 * @param xhr: XHR
 */
function buildActions(element, cur_kwargs, edit_mode, query, data, sts, xhr) {
    var workflow = $("select[name=workflow]",element);
    workflow.empty();
    workflow.append("<option value=''></option>");
    //Add a validator method for datetime
    $.validator.addMethod("datetime", function(value, element) {
        return this.optional(element) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}$/.test(value);
    }, "Invalid date and time format. Use: YYYY-MM-DDTHH:mm:SS.SSS");
    //Request containers from mozart
    $.ajax({
        url: "user_rules/get_container_names",
        success: function(data) { CONTAINERS = data["containers"]},
        error: function() { }
    });
    //Request jobs from mozart
    $.ajax({
        url: "user_rules/get_jobspec_names",
        success: function(data) { JOBSPECS = data["jobspecs"]},
        error: function() { }
    });
    //Build all actions
    var actions = data.actions;
    var actions_cfg = {};
    for (var i = 0; i < actions.length; i++) {
        actions_cfg[actions[i].type] = actions[i];
        var disabled = actions[i].public ? "" : "disabled";
        workflow.append("<option value='" + actions[i].type + "' " + disabled + ">" + actions[i].label + "</option>");
        HYSDSIOS.push(actions[i].type);
    }
    //What to do on workflow change
    workflow.change(function() {
        var actionName = $(this).val();
        var action = actions_cfg[actionName];
        buildWorkflows(action,actionName,$("fieldset[name=dynamic_fields]",element),$("select[name=queue]",element),cur_kwargs,query);
    });
    //Handle edit mode
    if (edit_mode) {
        $('#workflow').val($('#workflow_val').val()).change();
        $('#queue').val($('#queue_val').val()).change();
        $('#priority').val($('#priority_val').val()).change();
    }
}

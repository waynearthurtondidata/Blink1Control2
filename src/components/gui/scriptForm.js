"use strict";

var React = require('react');

var Grid = require('react-bootstrap').Grid;
var Col = require('react-bootstrap').Col;
var Row = require('react-bootstrap').Row;
var Modal = require('react-bootstrap').Modal;
var Input = require('react-bootstrap').Input;
var Button = require('react-bootstrap').Button;
var FormControls = require('react-bootstrap').FormControls;
// var ButtonGroup = require('react-bootstrap').ButtonGroup;
// var FormControls = require('react-bootstrap').FormControls;
var LinkedStateMixin = require('react-addons-linked-state-mixin');

var dialog = require('electron').remote.dialog;


var log = require('../../logger');


var ScriptForm = React.createClass({
    mixins: [LinkedStateMixin],
    propTypes: {
		rule: React.PropTypes.object.isRequired,
        patterns: React.PropTypes.array,
        onSave: React.PropTypes.func,
        onCancel: React.PropTypes.func,
        onDelete: React.PropTypes.func,
        onCopy: React.PropTypes.func
	},
    getInitialState: function() {
        return {};
    },
    // FIXME: why am I doing this instead of getInitialState?
    componentWillReceiveProps: function(nextProps) {
        var rule = nextProps.rule;
		this.setState({
            type: 'script',  // FIXME: allow URL & File here too?
            enabled: rule.enabled,
            name: rule.name,
            actionType: rule.actionType,
            patternId: rule.patternId,
            filepath: rule.filepath,
            intervalSecs: rule.intervalSecs || 10
         });
	},
    handleClose: function() {
        if( !this.state.filepath ) {
            this.setState({errormsg: 'Must choose a file'});
            return;
        }
        this.props.onSave(this.state);
    },
    openFileDialog: function() {
        var self = this;
        dialog.showOpenDialog(function (filenames) {
            if (filenames === undefined) { return; }
            var filename = filenames[0];
            self.setState({filepath: filename});
        });
    },
    handleActionType: function(e) {
        var actionType = e.target.value;
        this.setState({actionType:actionType});
    },
    render: function() {

        // var createPatternOption = function(item, idx) {
        //     return ( <option key={idx} value={item.id}>{item.name}</option> );
        // };
        // <Input labelClassName="col-xs-3" wrapperClassName="col-xs-5" bsSize="small"
        //     type="select" label="Pattern"
        //     valueLink={this.linkState('patternId')} >
        //     {this.props.patterns.map( createPatternOption, this )}
        // </Input>

        return (
            <div>
                <Modal show={this.props.show} onHide={this.handleClose} >
                    <Modal.Header>
                        <Modal.Title>Script Settings</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p style={{color: "#f00"}}>{this.state.errormsg}</p>
                        <p></p>
                        <form className="form-horizontal" >
                          <Input labelClassName="col-xs-3" wrapperClassName="col-xs-8"
                              type="text" label="Rule Name" placeholder="Descriptive name"
                              valueLink={this.linkState('name')} />
                          <Input labelClassName="col-xs-3" wrapperClassName="col-xs-8"
                              type="text" label="File Path" placeholder="Click to choose script / program / batch file"
                              valueLink={this.linkState('filepath')}
                              onClick={this.openFileDialog}/>
                          <Input labelClassName="col-xs-3" wrapperClassName="col-xs-5"
                              type="select" label="Check interval" placeholder="15 seconds"
                              valueLink={this.linkState('intervalSecs')} >
                              <option value="2">2 seconds</option>
                              <option value="5">5 seconds</option>
                              <option value="10">10 seconds</option>
                              <option value="15">15 seconds</option>
                              <option value="30">30 seconds</option>
                              <option value="60">1 minute</option>
                              <option value="360">5 minutes</option>
                          </Input>
                          <Grid >
                              <Row ><Col xs={2}>
                                  <label> Parse output as</label>
                              </Col><Col xs={4} style={{border:'0px solid green'}}>
                                  <Input
                                      type="radio" label="Parse output as color" value="parse-as-color"
                                      checked={this.state.actionType==='parse-as-color'}
                                      onChange={this.handleActionType} />
                                  <Input
                                      type="radio" label="Parse output as pattern name" value="parse-as-pattern"
                                      checked={this.state.actionType==='parse-as-pattern'}
                                      onChange={this.handleActionType} />
                              </Col></Row>
                          </Grid>

                      <Input wrapperClassName="col-xs-offset-3 col-xs-12" labelClassName="col-xs-3"
                            type="checkbox" label={<b>Enabled</b>} checkedLink={this.linkState('enabled')} />

                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button bsStyle="danger" bsSize="small" style={{float:'left'}} onClick={this.props.onDelete}>Delete</Button>
                        <Button bsSize="small" style={{float:'left'}} onClick={this.props.onCopy}>Copy</Button>
                        <Button onClick={this.props.onCancel}>Cancel</Button>
                        <Button onClick={this.handleClose}>OK</Button>
                    </Modal.Footer>
              </Modal>
          </div>
        );
    }
});

module.exports = ScriptForm;
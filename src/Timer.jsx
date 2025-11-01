import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { PlayFill, StopFill, ArrowCounterclockwise, DashLg, PlusLg } from 'react-bootstrap-icons';
import './Timer.css';
import Settings from './components/Settings';
import { useTimer } from './hooks/useTimer';

const Timer = () => {
    const { state, actions, formatters, computed } = useTimer();

    return (
        <Container fluid id="timer" className="round-phase">
            <Settings />
            <Row className="justify-content-center my-0">
                <Col md="auto">
                    <div className="current-time">
                        {formatters.formatCurrentTime(state.currentTime)}
                    </div>
                </Col>
            </Row>
            <Row className="justify-content-center mt-1">
                <Col md="auto">
                    <div className="status-display">
                        {computed.getStatusText()}
                    </div>
                </Col>
            </Row>
            <Row className="justify-content-center my-0">
                <Col md="auto">
                    <div className="d-flex align-items-center gap-2">
                        <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={() => actions.changeCurrentTime(-1)}
                            className="d-inline-flex align-items-center"
                        >
                            <DashLg />
                        </Button>
                        <div id="display" className={computed.isEndingSoon ? 'ending-soon' : ''}>
                            {formatters.formatTime(Math.max(0, state.timeLeft))}
                        </div>
                        <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={() => actions.changeCurrentTime(1)}
                            className="d-inline-flex align-items-center"
                        >
                            <PlusLg />
                        </Button>
                    </div>
                </Col>
            </Row>
            <Row className="justify-content-center my-2">
                <Col xs={12} lg={10} xl={8} className="mx-auto">
                    <div className="d-flex justify-content-center align-items-center gap-4">
                        <div className="timer-control-group">
                            <label className="me-2">Duration:</label>
                            <Button variant="secondary" size="sm" onClick={() => actions.changeRoundTime(-30)} className="d-inline-flex align-items-center">
                                <DashLg />
                            </Button>
                            <span className="mx-2">{formatters.formatTime(state.roundTime)}</span>
                            <Button variant="secondary" size="sm" onClick={() => actions.changeRoundTime(30)} className="d-inline-flex align-items-center">
                                <PlusLg />
                            </Button>
                        </div>
                    </div>
                    <div className="d-flex justify-content-center mt-4">
                        <Button variant={state.isRunning ? 'danger' : 'success'} onClick={actions.toggle} className="d-flex align-items-center me-3">
                            {state.isRunning ? <><StopFill className="me-1" /> Stop</> : <><PlayFill className="me-1" /> Start</>}
                        </Button>
                        <Button variant="dark" onClick={actions.reset} className="d-flex align-items-center">
                            <ArrowCounterclockwise className="me-1" /> Reset
                        </Button>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default Timer;
import { expect } from "chai";
import { describe } from "mocha";
import { parseSepticForTest } from "./util";
import { convertOPCObjects } from "../opc";

describe("Test converting of OPC objects", () => {
    it("Expect correct converting from UAProc + UAAppl to SopcProc", () => {
        const content = `
          UAProc:        UAProcName
     ServerURL=  "opc.tcp://localhost:4840"
        yPulse=  "s=pulse"
      UserName=  ""
      Password=  ""
  SecurityMode=  UA_MESSAGESECURITYMODE_SIGN
DefaultNameSpaceURI=  ""
credentialsPath=  ""
useSubscription=  OFF
monitorItemFilterTrigger=  UA_DATACHANGETRIGGER_STATUSVALUE
       RunMenu=  OFF
     xSchedule=  "s=schedule"
      ySimTime=  "s=time"
writeOnChangeOnly=  OFF

  UAAppl:        UAApplName
  xAllowActive=  "s=allowActive"
  xDesiredMode=  "s=desiredMode"
       yStatus=  "s=status"
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "ua-to-sopc");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObjects = convertedCnfg.objects[0]!;
        expect(convertedObjects.type).to.equal("SopcProc");
        expect(convertedObjects.identifier?.name).to.equal("UAApplName");
        expect(
            convertedObjects.getAttribute("ScheduleTag")?.getFirstValue(),
        ).to.equal("schedule");
        expect(
            convertedObjects.getAttribute("AllowActiveTag")?.getFirstValue(),
        ).to.equal("allowActive");
        expect(
            convertedObjects.getAttribute("StatusTag")?.getFirstValue(),
        ).to.equal("status");
        expect(
            convertedObjects.getAttribute("PulsTag")?.getFirstValue(),
        ).to.equal("pulse");
    });
    it("Expect correct converting from UAMvr to SopcMvr", () => {
        const content = `
  UAMvr:         UAMvrName
         xMeas=  "s=measMvr"
     xNotValid=  "s=notValidMvr"
 xProcessValue=  "s=processValueMvr"
 yCalcSetpoint=  "s=calcSetpointMvr"
xDesiredActive=  "s=desiredActiveMvr"
       yActive=  "s=activeMvr"
         xAuto=  "s=autoMvr"
       xExtern=  "s=externMvr"
   xIdealValue=  "s=idealValueMvr"
    xHighLimit=  "s=highLimitMvr"
     xLowLimit=  "s=lowLimitMvr"
   yIdealValue=  "s=idealValueOutMvr"
    yHighLimit=  "s=highLimitOutMvr"
     yLowLimit=  "s=lowLimitOutMvr"
    xMaxMoveUp=  "s=maxMoveUpMvr"
  xMaxMoveDown=  "s=maxMoveDownMvr"
   xWindupHigh=  "s=windupHighMvr"
    xWindupLow=  "s=windupLowMvr"
       yToComp=  "s=toCompMvr"
      yToLocal=  "s=toLocalMvr"
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "ua-to-sopc");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("SopcMvr");
        expect(convertedObject.identifier?.name).to.equal("UAMvrName");
        expect(
            convertedObject.getAttribute("MeasTag")?.getFirstValue(),
        ).to.equal("measMvr");
        expect(convertedObject.getAttribute("PVTag")?.getFirstValue()).to.equal(
            "processValueMvr",
        );
        expect(
            convertedObject.getAttribute("NotValidTag")?.getFirstValue(),
        ).to.equal("notValidMvr");
        expect(
            convertedObject.getAttribute("SpCalcTag")?.getFirstValue(),
        ).to.equal("calcSetpointMvr");
        expect(convertedObject.getAttribute("HiTag")?.getFirstValue()).to.equal(
            "highLimitMvr",
        );
        expect(convertedObject.getAttribute("LoTag")?.getFirstValue()).to.equal(
            "lowLimitMvr",
        );
        expect(convertedObject.getAttribute("IvTag")?.getFirstValue()).to.equal(
            "idealValueMvr",
        );
        expect(
            convertedObject.getAttribute("MvLowTag")?.getFirstValue(),
        ).to.equal("lowLimitOutMvr");
        expect(
            convertedObject.getAttribute("MvHighTag")?.getFirstValue(),
        ).to.equal("highLimitOutMvr");
        expect(
            convertedObject.getAttribute("MvIvTag")?.getFirstValue(),
        ).to.equal("idealValueOutMvr");
        expect(
            convertedObject.getAttribute("MaxUpTag")?.getFirstValue(),
        ).to.equal("maxMoveUpMvr");
        expect(
            convertedObject.getAttribute("MaxDownTag")?.getFirstValue(),
        ).to.equal("maxMoveDownMvr");
        expect(
            convertedObject.getAttribute("AutoTag")?.getFirstValue(),
        ).to.equal("autoMvr");
        expect(
            convertedObject.getAttribute("MaxDownTag")?.getFirstValue(),
        ).to.equal("maxMoveDownMvr");
        expect(
            convertedObject.getAttribute("MaxDownTag")?.getFirstValue(),
        ).to.equal("maxMoveDownMvr");
        expect(
            convertedObject.getAttribute("CompTag")?.getFirstValue(),
        ).to.equal("externMvr");
        expect(
            convertedObject.getAttribute("ToCompTag")?.getFirstValue(),
        ).to.equal("toCompMvr");
        expect(
            convertedObject.getAttribute("ToLocalTag")?.getFirstValue(),
        ).to.equal("toLocalMvr");
        expect(
            convertedObject.getAttribute("WhiTag")?.getFirstValue(),
        ).to.equal("windupHighMvr");
        expect(
            convertedObject.getAttribute("WloTag")?.getFirstValue(),
        ).to.equal("windupLowMvr");
        expect(
            convertedObject.getAttribute("MvActiveTag")?.getFirstValue(),
        ).to.equal("activeMvr");
    });
    it("Expect correct converting from UACvr to SopcCvr", () => {
        const content = `
  UACvr:         UACvrName
         xMeas=  "s=measCvr"
     xNotValid=  "s=notValidCvr"
xDesiredActive=  "s=desiredActiveCvr"
       yActive=  "s=activeCvr"
     xSetpoint=  "s=setpointCvr"
    xHighLimit=  "s=highLimitCvr"
     xLowLimit=  "s=lowLimitCvr"
     ySetpoint=  "s=setpointOutCvr"
    yHighLimit=  "s=highLimitOutCvr"
     yLowLimit=  "s=lowLimitOutCvr"
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "ua-to-sopc");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("SopcCvr");
        expect(convertedObject.identifier?.name).to.equal("UACvrName");
        expect(
            convertedObject.getAttribute("MeasTag")?.getFirstValue(),
        ).to.equal("measCvr");
        expect(convertedObject.getAttribute("SpTag")?.getFirstValue()).to.equal(
            "setpointCvr",
        );
        expect(convertedObject.getAttribute("LoTag")?.getFirstValue()).to.equal(
            "lowLimitCvr",
        );
        expect(convertedObject.getAttribute("HiTag")?.getFirstValue()).to.equal(
            "highLimitCvr",
        );
        expect(
            convertedObject.getAttribute("NotValidTag")?.getFirstValue(),
        ).to.equal("notValidCvr");
        expect(
            convertedObject.getAttribute("CvActiveTag")?.getFirstValue(),
        ).to.equal("activeCvr");
        expect(
            convertedObject.getAttribute("CvSwitchTag")?.getFirstValue(),
        ).to.equal("desiredActiveCvr");
        expect(
            convertedObject.getAttribute("CvLowTag")?.getFirstValue(),
        ).to.equal("lowLimitOutCvr");
        expect(
            convertedObject.getAttribute("CvHighTag")?.getFirstValue(),
        ).to.equal("highLimitOutCvr");
        expect(
            convertedObject.getAttribute("CvSetpointTag")?.getFirstValue(),
        ).to.equal("setpointOutCvr");
    });
    it("Expect correct converting from UADvr to SopcDvr", () => {
        const content = `
  UADvr:         UADvrName
         xMeas=  "s=measDvr"
     xNotValid=  "s=notValidDvr"
xDesiredTracking=  "s=desiredTrackingDvr"
     yTracking=  "s=trackingDvr"
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "ua-to-sopc");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("SopcDvr");
        expect(convertedObject.identifier?.name).to.equal("UADvrName");
        expect(
            convertedObject.getAttribute("MeasTag")?.getFirstValue(),
        ).to.equal("measDvr");
        expect(
            convertedObject.getAttribute("NotValidTag")?.getFirstValue(),
        ).to.equal("notValidDvr");
        expect(
            convertedObject.getAttribute("DvSwitchTag")?.getFirstValue(),
        ).to.equal("desiredTrackingDvr");
        expect(
            convertedObject.getAttribute("DvTrackTag")?.getFirstValue(),
        ).to.equal("trackingDvr");
    });
    it("Expect correct converting from UAEvr to SopcEvr", () => {
        const content = `
  UAEvr:         UAEvrName
         yMeas=  "s=measEvr"
     yNotValid=  "s=notValidEvr"
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "ua-to-sopc");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("SopcEvr");
        expect(convertedObject.identifier?.name).to.equal("UAEvrName");
        expect(
            convertedObject.getAttribute("MeasTag")?.getFirstValue(),
        ).to.equal("measEvr");
        expect(
            convertedObject.getAttribute("NotValidTag")?.getFirstValue(),
        ).to.equal("notValidEvr");
    });
    it("Expect correct converting from UAEvr to SopcEvr", () => {
        const content = `
  UAEvr:         UAEvrName
         yMeas=  "s=measEvr"
     yNotValid=  "s=notValidEvr"
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "ua-to-sopc");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("SopcEvr");
        expect(convertedObject.identifier?.name).to.equal("UAEvrName");
        expect(
            convertedObject.getAttribute("MeasTag")?.getFirstValue(),
        ).to.equal("measEvr");
        expect(
            convertedObject.getAttribute("NotValidTag")?.getFirstValue(),
        ).to.equal("notValidEvr");
    });
    it("Expect correct converting from UATvr to SopcTvr", () => {
        const content = `
  UATvr:         UATvrName
         xMeas=  "s=measTvr"
     xNotValid=  "s=notValidTvr"
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "ua-to-sopc");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("SopcTvr");
        expect(convertedObject.identifier?.name).to.equal("UATvrName");
        expect(
            convertedObject.getAttribute("MeasTag")?.getFirstValue(),
        ).to.equal("measTvr");
        expect(
            convertedObject.getAttribute("NotValidTag")?.getFirstValue(),
        ).to.equal("notValidTvr");
    });
    it("Expect correct converting from SopcProc to UAProc + UAAppl", () => {
        const content = `
  SopcProc:      SopcProcName
         Text1=  ""
         Text2=  ""
          Site=  AIM_AIMGUI
      ServName=  "Statoil.OPC.Server"
      ServNode=  "SERVNODE"
   RealTimeFac=  1.0
       ProcTag=  "DUMMY_TAG"
AllowActiveTag=  "allowActive"
     StatusTag=  "status"
    DesModeTag=  "desiredMode"
       PulsTag=  "pulse"
LoopcheckWriteTag=  "DUMMY_TAG"
LoopcheckReadTag=  "DUMMY_TAG"
 ServFactorTag=  "DUMMY_TAG"
    CPUTimeTag=  "DUMMY_TAG"
         IdTag=  ""
   ScheduleTag=  "time"
        RunSec=  -1
   RequestRate=  -1
 BadCountLimit=  0
SampleAgeLimit=  -1
BlockWritingIfBad=  OFF
   WriteGroups=  1
WriteGroupPause=  1000
SkipWriteBlocking=  OFF
  UseDCOMAUTHN=  ON
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "sopc-to-ua");
        expect(convertedCnfg.objects.length).to.equal(2);
        const uaProcObject = convertedCnfg.objects[0]!;
        expect(uaProcObject.type).to.equal("UAProc");
        expect(uaProcObject.identifier?.name).to.equal("SopcProcName");
        const uaApplObject = convertedCnfg.objects[1]!;
        expect(uaApplObject.type).to.equal("UAAppl");
        expect(uaApplObject.identifier?.name).to.equal("SopcProcName");
        expect(uaProcObject.getAttribute("yPulse")?.getFirstValue()).to.equal(
            "s=pulse",
        );
        expect(
            uaProcObject.getAttribute("xSchedule")?.getFirstValue(),
        ).to.equal("s=time");
        expect(
            uaApplObject.getAttribute("xAllowActive")?.getFirstValue(),
        ).to.equal("s=allowActive");
        expect(
            uaApplObject.getAttribute("xDesiredMode")?.getFirstValue(),
        ).to.equal("s=allowActive");
        expect(uaApplObject.getAttribute("yStatus")?.getFirstValue()).to.equal(
            "s=status",
        );
    });
    it("Expect correct converting from SopcMvr to UAMvr", () => {
        const content = `
  SopcMvr:       SopcMvrName
         Text1=  ""
         Text2=  ""
        MvrTag=  ""
       MeasTag=  "measMvr"
         PVTag=  "processValueMvr"
         IdTag=  ""
   NotValidTag=  "notValidMvr"
     SpCalcTag=  "calcSetpointMvr"
         HiTag=  "highLimitMvr"
         LoTag=  "lowLimitMvr"
         IvTag=  "idealValueMvr"
      MvLowTag=  "lowLimitOutMvr"
     MvHighTag=  "highLimitOutMvr"
       MvIvTag=  "idealValueOutMvr"
      MaxUpTag=  "maxMoveUpMvr"
    MaxDownTag=  "maxMoveDownMvr"
       AutoTag=  "autoMvr"
        WhiTag=  "windupHighMvr"
        WloTag=  "windupLowMvr"
       CompTag=  "externMvr"
       CaraTag=  "DUMMY_TAG"
       TrakTag=  "DUMMY_TAG"
     ToCompTag=  "toCompMvr"
    ToLocalTag=  "toLocalMvr"
   MvActiveTag=  "activeMvr"
   MvSwitchTag=  "desiredActiveMvr"
 CompStatusTag=  "DUMMY_TAG"
         Scale=  1
        Offset=  0
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "sopc-to-ua");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("UAMvr");
        expect(convertedObject.identifier?.name).to.equal("SopcMvrName");
        expect(convertedObject.getAttribute("xMeas")?.getFirstValue()).to.equal(
            "s=measMvr",
        );
        expect(
            convertedObject.getAttribute("xProcessValue")?.getFirstValue(),
        ).to.equal("s=processValueMvr");
        expect(
            convertedObject.getAttribute("xNotValid")?.getFirstValue(),
        ).to.equal("s=notValidMvr");
        expect(
            convertedObject.getAttribute("yCalcSetpoint")?.getFirstValue(),
        ).to.equal("s=calcSetpointMvr");
        expect(
            convertedObject.getAttribute("xDesiredActive")?.getFirstValue(),
        ).to.equal("s=externMvr");
        expect(
            convertedObject.getAttribute("yActive")?.getFirstValue(),
        ).to.equal("s=activeMvr");
        expect(convertedObject.getAttribute("xAuto")?.getFirstValue()).to.equal(
            "s=autoMvr",
        );
        expect(
            convertedObject.getAttribute("xExtern")?.getFirstValue(),
        ).to.equal("s=externMvr");
        expect(
            convertedObject.getAttribute("xHighLimit")?.getFirstValue(),
        ).to.equal("s=highLimitMvr");
        expect(
            convertedObject.getAttribute("xLowLimit")?.getFirstValue(),
        ).to.equal("s=lowLimitMvr");
        expect(
            convertedObject.getAttribute("xIdealValue")?.getFirstValue(),
        ).to.equal("s=idealValueMvr");
        expect(
            convertedObject.getAttribute("yLowLimit")?.getFirstValue(),
        ).to.equal("s=lowLimitOutMvr");
        expect(
            convertedObject.getAttribute("yHighLimit")?.getFirstValue(),
        ).to.equal("s=highLimitOutMvr");
        expect(
            convertedObject.getAttribute("yIdealValue")?.getFirstValue(),
        ).to.equal("s=idealValueOutMvr");
        expect(
            convertedObject.getAttribute("xMaxMoveUp")?.getFirstValue(),
        ).to.equal("s=maxMoveUpMvr");
        expect(
            convertedObject.getAttribute("xMaxMoveDown")?.getFirstValue(),
        ).to.equal("s=maxMoveDownMvr");
        expect(
            convertedObject.getAttribute("yToComp")?.getFirstValue(),
        ).to.equal("s=toCompMvr");
        expect(
            convertedObject.getAttribute("yToLocal")?.getFirstValue(),
        ).to.equal("s=toLocalMvr");
    });
    it("Expect correct converting from SopcCvr to UACvr", () => {
        const content = `
  SopcCvr:       SopcCvrName
         Text1=  ""
         Text2=  ""
        CvrTag=  ""
       MeasTag=  "measCvr"
         IdTag=  ""
         SpTag=  "setpointCvr"
      CvLowTag=  "lowLimitOutCvr"
     CvHighTag=  "highLimitOutCvr"
 CvSetpointTag=  "setpointOutCvr"
   NotValidTag=  "notValidCvr"
   CvSwitchTag=  "desiredActiveCvr"
   CvActiveTag=  "activeCvr"
         LoTag=  "lowLimitCvr"
         HiTag=  "highLimitCvr"
         Scale=  1
        Offset=  0
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "sopc-to-ua");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("UACvr");
        expect(convertedObject.identifier?.name).to.equal("SopcCvrName");
        expect(convertedObject.getAttribute("xMeas")?.getFirstValue()).to.equal(
            "s=measCvr",
        );
        expect(
            convertedObject.getAttribute("xNotValid")?.getFirstValue(),
        ).to.equal("s=notValidCvr");
        expect(
            convertedObject.getAttribute("xDesiredActive")?.getFirstValue(),
        ).to.equal("s=desiredActiveCvr");
        expect(
            convertedObject.getAttribute("yActive")?.getFirstValue(),
        ).to.equal("s=activeCvr");
        expect(
            convertedObject.getAttribute("xSetpoint")?.getFirstValue(),
        ).to.equal("s=setpointCvr");
        expect(
            convertedObject.getAttribute("xHighLimit")?.getFirstValue(),
        ).to.equal("s=highLimitCvr");
        expect(
            convertedObject.getAttribute("xLowLimit")?.getFirstValue(),
        ).to.equal("s=lowLimitCvr");
        expect(
            convertedObject.getAttribute("ySetpoint")?.getFirstValue(),
        ).to.equal("s=setpointOutCvr");
        expect(
            convertedObject.getAttribute("yLowLimit")?.getFirstValue(),
        ).to.equal("s=lowLimitOutCvr");
        expect(
            convertedObject.getAttribute("yHighLimit")?.getFirstValue(),
        ).to.equal("s=highLimitOutCvr");
    });
    it("Expect correct converting from SopcDvr to UADvr", () => {
        const content = `
  SopcDvr:       SopcDvrName
         Text1=  ""
         Text2=  ""
        DvrTag=  ""
       MeasTag=  "measDvr"
         IdTag=  ""
   NotValidTag=  "notValidDvr"
   DvSwitchTag=  "desiredActiveDvr"
    DvTrackTag=  "trackingDvr"
         Scale=  1
        Offset=  0
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "sopc-to-ua");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("UADvr");
        expect(convertedObject.identifier?.name).to.equal("SopcDvrName");
        expect(convertedObject.getAttribute("xMeas")?.getFirstValue()).to.equal(
            "s=measDvr",
        );
        expect(
            convertedObject.getAttribute("xNotValid")?.getFirstValue(),
        ).to.equal("s=notValidDvr");
        expect(
            convertedObject.getAttribute("xDesiredTracking")?.getFirstValue(),
        ).to.equal("s=desiredActiveDvr");
        expect(
            convertedObject.getAttribute("yTracking")?.getFirstValue(),
        ).to.equal("s=trackingDvr");
    });
    it("Expect correct converting from SopcEvr to UAEvr", () => {
        const content = `
  SopcEvr:       SopcEvrName
         Text1=  ""
         Text2=  ""
        EvrTag=  ""
       MeasTag=  "measEvr"
         IdTag=  ""
   NotValidTag=  "notValidEvr"
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "sopc-to-ua");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("UAEvr");
        expect(convertedObject.identifier?.name).to.equal("SopcEvrName");
        expect(convertedObject.getAttribute("yMeas")?.getFirstValue()).to.equal(
            "s=measEvr",
        );
        expect(
            convertedObject.getAttribute("yNotValid")?.getFirstValue(),
        ).to.equal("s=notValidEvr");
    });
    it("Expect correct converting from SopcTvr to UATvr", () => {
        const content = `
  SopcTvr:       SopcTvrName
         Text1=  ""
         Text2=  ""
        TvrTag=  ""
       MeasTag=  "measTvr"
   NotValidTag=  "notValidTvr"
      Text1Tag=  ""
         Scale=  1
        Offset=  0
`;
        const cnfg = parseSepticForTest(content);
        const convertedCnfg = convertOPCObjects(cnfg, "sopc-to-ua");
        expect(convertedCnfg.objects.length).to.equal(1);
        const convertedObject = convertedCnfg.objects[0]!;
        expect(convertedObject.type).to.equal("UATvr");
        expect(convertedObject.identifier?.name).to.equal("SopcTvrName");
        expect(convertedObject.getAttribute("xMeas")?.getFirstValue()).to.equal(
            "s=measTvr",
        );
        expect(
            convertedObject.getAttribute("xNotValid")?.getFirstValue(),
        ).to.equal("s=notValidTvr");
    });
});

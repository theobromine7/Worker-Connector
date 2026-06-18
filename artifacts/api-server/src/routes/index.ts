import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import workersRouter from "./workers";
import jobsRouter from "./jobs";
import applicationsRouter from "./applications";
import payoutsRouter from "./payouts";
import adminRouter from "./admin";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(workersRouter);
router.use(jobsRouter);
router.use(applicationsRouter);
router.use(payoutsRouter);
router.use(adminRouter);
router.use(analyticsRouter);

export default router;

import {MissingDriverError} from "../error/MissingDriverError";
import {PostgresDriver} from "./postgres/PostgresDriver";
import {Driver} from "./Driver";
import {Connection} from "../connection/Connection";

/**
 * Helps to create drivers.
 */
export class DriverFactory {

    /**
     * Creates a new driver depend on a given connection's driver type.
     */
    create(connection: Connection): Driver {
        const {type} = connection.options;
        switch (type) {
            case "postgres":
                return new PostgresDriver(connection);
            default:
                throw new MissingDriverError(type);
        }
    }

}

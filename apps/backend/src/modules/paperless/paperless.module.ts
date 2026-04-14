import { Module, forwardRef } from '@nestjs/common';
import { PaperlessClient } from './paperless.client';
import { PaperlessService } from './paperless.service';
import { PaperlessController } from './paperless.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [forwardRef(() => TenantsModule)],
  providers: [PaperlessClient, PaperlessService],
  controllers: [PaperlessController],
  exports: [PaperlessService],
})
export class PaperlessModule {}

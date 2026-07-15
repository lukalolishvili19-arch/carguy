import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { CommentsService } from './comments.service';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  controllers: [PostsController, StoriesController],
  providers: [PostsService, CommentsService, StoriesService],
  exports: [PostsService],
})
export class PostsModule {}

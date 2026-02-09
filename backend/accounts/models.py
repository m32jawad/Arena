from django.db import models


class Storyline(models.Model):
    title = models.CharField(max_length=255)
    text = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='storylines/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
